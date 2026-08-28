import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "MONARCA BARBER", timestamp: new Date().toISOString() });
});

// ImgBB Upload Proxy - Keeps IMGBB_API_KEY safe on server side
app.post("/api/imgbb/upload", async (req, res) => {
  try {
    const { image, name } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data (base64 string or URL required)" });
    }

    const apiKey = process.env.IMGBB_API_KEY;

    // Clean base64 string if data URL scheme is present
    const cleanBase64 = image.includes(",") ? image.split(",")[1] : image;

    if (apiKey && apiKey.trim().length > 0) {
      const formData = new URLSearchParams();
      formData.append("image", cleanBase64);
      if (name) formData.append("name", name);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey.trim()}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return res.status(response.status || 500).json({
          error: data?.error?.message || "Failed to upload image to ImgBB",
          details: data,
        });
      }

      return res.json({
        success: true,
        data: {
          id: data.data.id,
          title: data.data.title,
          url: data.data.url,
          display_url: data.data.display_url,
          thumb: data.data.thumb?.url || data.data.url,
          delete_url: data.data.delete_url,
        },
      });
    } else {
      // Graceful fallback when IMGBB_API_KEY is not configured yet in environment
      // We return the high-res data URL or placeholder so user workflow never breaks
      const dataUri = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
      return res.json({
        success: true,
        isSimulated: true,
        message: "Image processed locally (IMGBB_API_KEY not configured in environment settings)",
        data: {
          id: `local_${Date.now()}`,
          title: name || "barber_asset",
          url: dataUri,
          display_url: dataUri,
          thumb: dataUri,
        },
      });
    }
  } catch (error: any) {
    console.error("ImgBB upload server error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error uploading image",
    });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MONARCA BARBER server running on http://0.0.0.0:${PORT}`);
  });
}

start();
