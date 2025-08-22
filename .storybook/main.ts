import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../src/components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
    {
      name: '@storybook/addon-styling',
      options: {
        postCss: {
          implementation: require.resolve('postcss'),
        },
      },
    },
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  features: {
    experimentalRSC: true,
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }
    
    // Handle CSS modules
    const rules = config.module?.rules || [];
    const cssRule = rules.find((rule: any) =>
      rule?.test?.toString().includes('.css')
    ) as any;

    if (cssRule) {
      cssRule.use = cssRule.use?.map((use: any) => {
        if (use.loader && use.loader.includes('css-loader')) {
          return {
            ...use,
            options: {
              ...use.options,
              importLoaders: 1,
            },
          };
        }
        return use;
      });
    }

    return config;
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;