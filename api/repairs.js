const SHEET_URL = process.env.REPAIRS_SHEET_URL;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (!SHEET_URL) {
      return res.status(500).json({
        success: false,
        message: "REPAIRS_SHEET_URL is not configured",
      });
    }

    const { method, body } = req;

    if (method === "GET") {
      // Fetch all repairs
      const response = await fetch(`${SHEET_URL}?action=getRepairs`);
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (method === "POST") {
      // Create new repair
      const response = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addRepair", ...body }),
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (method === "PUT") {
      // Update existing repair
      const response = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRepair", ...body }),
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (method === "DELETE") {
      // Delete repair
      const response = await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteRepair", ...body }),
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
