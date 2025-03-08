import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";
import "./stories.css";

const preview: Preview = {};

export default preview;

export const decorators = [
  withThemeByClassName({
    defaultTheme: "light",
    themes: {
      light: "light",
      dark: "dark",
    },
  }),
];
