import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollapsibleSection from "@/components/CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders the title", () => {
    render(
      <CollapsibleSection title="My Section">
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("My Section")).toBeInTheDocument();
  });

  it("renders title with count", () => {
    render(
      <CollapsibleSection title="Tasks" count={5}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("Tasks (5)")).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    render(
      <CollapsibleSection title="Section">
        <p>Hidden content</p>
      </CollapsibleSection>,
    );
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("expands when initiallyExpanded is true", () => {
    render(
      <CollapsibleSection title="Section" initiallyExpanded>
        <p>Visible content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("toggles content on click", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Section">
        <p>Toggle me</p>
      </CollapsibleSection>,
    );

    expect(screen.queryByText("Toggle me")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Toggle me")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("Toggle me")).not.toBeInTheDocument();
  });
});
