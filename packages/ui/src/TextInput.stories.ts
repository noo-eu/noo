import type { Meta, StoryObj } from "@storybook/react";

import { TextInput } from "./TextInput";

const meta = {
  title: "noo/TextInput",
  component: TextInput,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    type: {
      control: {
        type: "select",
        options: ["text", "email", "password"],
      },
    },
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: "text",
  },
};
