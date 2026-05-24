import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock React imports
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: vi.fn(),
    useFormStatus: vi.fn(),
  };
});

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    useFormStatus: vi.fn(),
    useFormState: vi.fn(),
  };
});

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const forwardRef = React.forwardRef;
  const filterProps = (props: any) => {
    const { layoutId, animate, initial, exit, transition, ...rest } = props;
    return rest;
  };
  return {
    motion: {
      div: forwardRef((props: any, ref) => <div ref={ref} {...filterProps(props)} />),
      span: forwardRef((props: any, ref) => <span ref={ref} {...filterProps(props)} />),
      h4: forwardRef((props: any, ref) => <h4 ref={ref} {...filterProps(props)} />),
      p: forwardRef((props: any, ref) => <p ref={ref} {...filterProps(props)} />),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div>LineChart</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
}));
