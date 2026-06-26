import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => children,
    motion: {
      div: require('react').forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, layoutId, ...rest } = props;
        return require('react').createElement('div', { ref, ...rest });
      }),
      span: require('react').forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, layoutId, ...rest } = props;
        return require('react').createElement('span', { ref, ...rest });
      }),
      ul: require('react').forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, layoutId, ...rest } = props;
        return require('react').createElement('ul', { ref, ...rest });
      }),
      li: require('react').forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, layoutId, ...rest } = props;
        return require('react').createElement('li', { ref, ...rest });
      }),
      button: require('react').forwardRef((props: any, ref: any) => {
        const { animate, initial, exit, transition, layoutId, ...rest } = props;
        return require('react').createElement('button', { ref, ...rest });
      })
    },
  };
});
