/**
 * <SectionsContainer> — wraps a route's section list and assigns per-route
 * positional numbers via cloneElement.
 *
 * Per `decision-section-identity`:
 *   - Numbering is per-route. `/` has Sections 01–06; `/about` has 01–04.
 *     Wrap each route's sections in <SectionsContainer> and the count resets.
 *   - Reordering children → numbers update; slug IDs do NOT.
 *
 * Section components are expected to accept a `position` prop and forward it
 * to their root <Section> wrapper.
 *
 * Usage:
 *   <SectionsContainer>
 *     <HeroSplitBold />
 *     <FeatureGrid />
 *     <CtaBand />
 *   </SectionsContainer>
 *
 * Server-component-safe: pure cloneElement, no state, no client boundary.
 */

import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";

export function SectionsContainer({ children }: { children: ReactNode }) {
  let position = 0;
  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        position += 1;
        return cloneElement(child as ReactElement<{ position?: number }>, {
          position,
        });
      })}
    </>
  );
}
