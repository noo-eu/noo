import type { Meta, StoryObj } from "@storybook/react";

import { TextField } from "./TextField";

const meta = {
  title: "noo/TextField",
  component: TextField,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    label: {
      control: {
        type: "text",
      },
    },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "My label",
  },
};

export const WithError: Story = {
  args: {
    label: "My label",
    error: "This field is required",
  },
};

export const WithSuffix: Story = {
  args: {
    label: "My label",
    suffix: "suffix",
  },
};
