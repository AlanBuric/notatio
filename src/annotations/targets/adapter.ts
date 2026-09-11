export interface TargetMeasurement {
  rects: DOMRect[];
  style: CSSStyleDeclaration;
}

/** Adapts an element or a text range to what an annotation needs: geometry, an insertion point, and change signals. */
export interface TargetAdapter {
  readonly anchor: HTMLElement | null;
  placeSvg(svg: SVGSVGElement, behind: boolean): void;
  measure(multiline: boolean): TargetMeasurement;
  observeReflow(onReflow: () => void): (() => void) | undefined;
  observeVisibility(
    options: IntersectionObserverInit,
    onChange: (visible: boolean) => void,
  ): (() => void) | undefined;
  release(): void;
}
