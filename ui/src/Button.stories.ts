import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./Button";

const meta = {
  title: "noo/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    kind: {
      control: {
        type: "select",
        options: ["primary", "secondary"],
      },
    },
    children: {
      control: {
        type: "text",
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    kind: "primary",
    children: "Button",
  },
};

export const Secondary: Story = {
  args: {
    kind: "secondary",
    children: "Button",
  },
};
