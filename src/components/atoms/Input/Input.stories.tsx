import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Input } from './Input';
import { Icon } from '../Icon';

const meta: Meta<typeof Input> = {
  title: 'Design System/Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile input component with built-in icon support, validation states, and multiple sizes. Designed for accessibility and performance.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'default', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'error', 'success'],
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
    placeholder: 'Enter text...',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Default input',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input size="sm" placeholder="Small input" />
      <Input size="default" placeholder="Default input" />
      <Input size="lg" placeholder="Large input" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input variant="default" placeholder="Default state" />
      <Input variant="error" placeholder="Error state" value="Invalid input" />
      <Input variant="success" placeholder="Success state" value="Valid input" />
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input 
        leftIcon={<Icon name="Search" size="sm" />}
        placeholder="Search..."
      />
      <Input 
        rightIcon={<Icon name="Eye" size="sm" />}
        type="password"
        placeholder="Password"
      />
      <Input 
        leftIcon={<Icon name="Mail" size="sm" />}
        rightIcon={<Icon name="Check" size="sm" />}
        type="email"
        placeholder="email@example.com"
      />
    </div>
  ),
};

export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <Input 
          error="This field is required"
          placeholder="Required field"
          leftIcon={<Icon name="AlertCircle" size="sm" />}
        />
        <p className="text-sm text-destructive mt-1">This field is required</p>
      </div>
      <div>
        <Input 
          success="Email is valid"
          value="user@example.com"
          leftIcon={<Icon name="Mail" size="sm" />}
          rightIcon={<Icon name="CheckCircle2" size="sm" />}
        />
        <p className="text-sm text-green-600 mt-1">Email is valid</p>
      </div>
    </div>
  ),
};

export const InputTypes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input type="text" placeholder="Text input" />
      <Input type="email" placeholder="Email input" />
      <Input type="password" placeholder="Password input" />
      <Input type="number" placeholder="Number input" />
      <Input type="search" placeholder="Search input" />
      <Input type="tel" placeholder="Phone input" />
      <Input type="url" placeholder="URL input" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
    value: 'Cannot edit this',
  },
};