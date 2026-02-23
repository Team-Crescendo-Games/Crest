import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Header from "@/components/Header";

describe("Header", () => {
  it("renders the name", () => {
    render(<Header name="My Board" />);
    expect(screen.getByText("My Board")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<Header name="Title" description="Some description" />);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<Header name="Title" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders button component when provided", () => {
    render(
      <Header
        name="Title"
        buttonComponent={<button>Click me</button>}
      />,
    );
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("uses smaller text when isSmallText is true", () => {
    render(<Header name="Small" isSmallText />);
    const heading = screen.getByText("Small");
    expect(heading.className).toContain("text-lg");
    expect(heading.className).not.toContain("text-2xl");
  });

  it("uses larger text by default", () => {
    render(<Header name="Large" />);
    const heading = screen.getByText("Large");
    expect(heading.className).toContain("text-2xl");
  });
});
