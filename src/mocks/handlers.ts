import { http, HttpResponse, delay } from "msw";

export const handlers = [
  // Success path
  http.get("/w2w/shifts", async ({ request }) => {
    // simulate network latency so you see skeletons
    await delay(600);

    return HttpResponse.json({
      items: [
        {
          id: "s1",
          role: "Barista",
          location: "HQ",
          start: "2025-10-10T09:00:00Z",
          end: "2025-10-10T17:00:00Z",
        },
        {
          id: "s2",
          role: "Cashier",
          location: "Downtown",
          start: "2025-10-11T10:30:00Z",
          end: "2025-10-11T18:30:00Z",
        },
      ],
    });
  }),

  // Example error route (toggle your component to hit this if needed)
  http.get("/w2w/shifts-error", async () => {
    await delay(400);
    return HttpResponse.json(
      { detail: "When2Work temporarily unavailable" },
      { status: 503 }
    );
  }),
];