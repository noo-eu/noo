import type { Meta, StoryObj } from "@storybook/react";

import { IntlProvider } from "use-intl";
import { PasswordField } from "./PasswordField";

const messages = {
  common: {
    passwordField: {
      ariaLabelShow: "Show password",
      hide: "Hide",
      show: "Show",
    },
  },
};

const meta = {
  title: "noo/PasswordField",
  component: PasswordField,
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
  decorators: [
    (Story) => (
      <IntlProvider locale="en" messages={messages}>
        <Story />
      </IntlProvider>
    ),
  ],
} satisfies Meta<typeof PasswordField>;

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
