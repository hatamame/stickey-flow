// src/components/ColorPalette.tsx

import type { StickyNote } from "../types";

// 付箋の色とHEXコードの対応
export const colorHexMap: Record<StickyNote["color"], string> = {
  yellow: "#fffba6",
  blue: "#a6d9ff",
  green: "#ccffb3",
  pink: "#ffc2e2",
  orange: "#ffd5a6",
  purple: "#d5b4ff",
};

interface Props {
  selectedColor: StickyNote["color"];
  onColorSelect: (color: StickyNote["color"]) => void;
}

export const ColorPalette = ({ selectedColor, onColorSelect }: Props) => {
  return (
    <div className="flex gap-2 p-2 bg-white rounded-full shadow-lg">
      {Object.entries(colorHexMap).map(([colorName, hex]) => (
        <button
          key={colorName}
          onClick={() => onColorSelect(colorName as StickyNote["color"])}
          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
            selectedColor === colorName
              ? "ring-2 ring-blue-500 ring-offset-2"
              : ""
          }`}
          style={{ backgroundColor: hex }}
          aria-label={colorName}
        />
      ))}
    </div>
  );
};
