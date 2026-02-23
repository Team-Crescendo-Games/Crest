import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationBadge from "@/components/NotificationBadge";

describe("NotificationBadge", () => {
  it("renders the bell icon button", () => {
    render(<NotificationBadge count={0} onClick={() => {}} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("does not show badge when count is 0", () => {
    render(<NotificationBadge count={0} onClick={() => {}} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows count when greater than 0", () => {
    render(<NotificationBadge count={5} onClick={() => {}} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 99+ for counts over 99", () => {
    render(<NotificationBadge count={150} onClick={() => {}} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<NotificationBadge count={3} onClick={handleClick} />);
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("has accessible label with count", () => {
    render(<NotificationBadge count={5} onClick={() => {}} />);
    expect(screen.getByLabelText("Notifications (5 unread)")).toBeInTheDocument();
  });

  it("has accessible label without count when 0", () => {
    render(<NotificationBadge count={0} onClick={() => {}} />);
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });
});
