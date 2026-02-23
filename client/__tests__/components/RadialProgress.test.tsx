import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import RadialProgress from "@/components/RadialProgress";

describe("RadialProgress", () => {
  it("renders an SVG element", () => {
    const { container } = render(<RadialProgress completed={3} total={10} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    const { container } = render(<RadialProgress completed={3} total={10} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("3 of 10 completed");
  });

  it("renders two circles (background + foreground)", () => {
    const { container } = render(<RadialProgress completed={5} total={10} />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  it("uses emerald color when fully complete", () => {
    const { container } = render(<RadialProgress completed={10} total={10} />);
    const foreground = container.querySelectorAll("circle")[1];
    expect(foreground?.getAttribute("class")).toContain("emerald");
  });

  it("uses blue color when not fully complete", () => {
    const { container } = render(<RadialProgress completed={5} total={10} />);
    const foreground = container.querySelectorAll("circle")[1];
    expect(foreground?.getAttribute("class")).toContain("blue");
  });

  it("handles 0 total gracefully", () => {
    const { container } = render(<RadialProgress completed={0} total={0} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("respects custom size prop", () => {
    const { container } = render(
      <RadialProgress completed={1} total={2} size={40} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("40");
    expect(svg?.getAttribute("height")).toBe("40");
  });
});
