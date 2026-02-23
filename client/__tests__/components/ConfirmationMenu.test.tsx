import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmationMenu from "@/components/ConfirmationMenu";

describe("ConfirmationMenu", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Delete item?",
    message: "This action cannot be undone.",
  };

  it("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmationMenu {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and message when open", () => {
    render(<ConfirmationMenu {...defaultProps} />);
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmationMenu {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmationMenu {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses custom button labels", () => {
    render(
      <ConfirmationMenu
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
      />,
    );
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("No, keep")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<ConfirmationMenu {...defaultProps} isLoading />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <ConfirmationMenu {...defaultProps}>
        <p>Extra info</p>
      </ConfirmationMenu>,
    );
    expect(screen.getByText("Extra info")).toBeInTheDocument();
  });
});
