import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("TaskFormDialog", () => {
  it("opens the New Task dialog when clicked", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
