// src/types/global.d.ts

// Extend the global JSX.IntrinsicElements interface to include your custom element
declare namespace JSX {
  interface IntrinsicElements {
    'place-autocomplete-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      placeholder?: string;
      value?: string;
      // Add any other attributes you use, e.g., 'class', 'id', etc.
    };
  }
}

// Declare the 'place' property on the HTMLElement for the place_changed event
interface HTMLElement {
  place?: google.maps.places.PlaceResult; // Requires @types/google.maps
}