import "dotenv/config";

import express, {
  type Request,
  type Response,
  type Application,
} from "express";

const app: Application = express();
const PORT = process.env.PROCESSOR_PORT;

app.get("/", (req: Request, res: Response) => {
  res.send("TypeScript Express Server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
