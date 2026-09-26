import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import SchoolToday from "./SchoolToday.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SchoolToday />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
