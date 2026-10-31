import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ZodError } from "zod";
import { authRouter, requireAuth } from "./auth";
import { router } from "./routes";

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error(
    "Missing JWT_SECRET or DATABASE_URL. Copy .env.example to .env first.",
  );
  process.exit(1);
}

const app = express();

const clientUrl = process.env.CLIENT_URL;

if (clientUrl) {
  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
    }),
  );
}

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api", requireAuth, router);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(Number(process.env.PORT ?? 4000), () =>
  console.log("Server running"),
);
