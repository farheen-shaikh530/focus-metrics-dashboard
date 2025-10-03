import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App", () => {
  it("shows the dashboard nav link", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("renders the dashboard page heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /dashboard overview/i, level: 2 }))
      .toBeInTheDocument();
  });

  it("renders the three Kanban columns", () => {
    render(<App />);
    expect(screen.getByText(/to do/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/done/i)).toBeInTheDocument();
  });

  // ✅ New test here
  it("opens the New Task dialog when clicked", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});