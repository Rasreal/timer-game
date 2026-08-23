import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import * as Icons from '../../src/components/Icons';

jest.mock('../../src/lib/supabase');

type IconComponent = (props: Record<string, unknown>) => ReactElement;

const entries = Object.entries(Icons);

/** Everything the module exports that is a component (i.e. not fillParent). */
const components = entries.filter(
  (e): e is [string, IconComponent] => typeof e[1] === 'function',
);

describe('Icons module surface', () => {
  it('exports at least one icon', () => {
    expect(components.length).toBeGreaterThan(0);
  });

  it('exports the icons the screens import by name', () => {
    for (const name of [
      'CalcIcon',
      'ListIcon',
      'DumbbellIcon',
      'PersonIcon',
      'EyeIcon',
      'LockIcon',
    ]) {
      expect(typeof (Icons as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('exports fillParent as an absolute-fill style object', () => {
    expect(Icons.fillParent).toEqual({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
  });
});

describe('every exported icon renders', () => {
  // Programmatic sweep: any icon added later is covered automatically.
  it.each(components.map(([name]) => name))('%s renders without crashing', (name) => {
    const Icon = (Icons as unknown as Record<string, IconComponent>)[name];
    const view = render(<Icon color="#000" />);
    expect(view.toJSON()).toBeTruthy();
    view.unmount();
  });

  it.each(components.map(([name]) => name))(
    '%s renders with no props at all',
    (name) => {
      const Icon = (Icons as unknown as Record<string, IconComponent>)[name];
      // CalcIcon/ListIcon/DumbbellIcon/PersonIcon type `color` as required, but
      // nothing in the implementation throws when it is undefined.
      const view = render(<Icon />);
      expect(view.toJSON()).toBeTruthy();
      view.unmount();
    },
  );

  it.each(components.map(([name]) => name))(
    '%s paints the colour it is handed',
    (name) => {
      const Icon = (Icons as unknown as Record<string, IconComponent>)[name];
      const view = render(<Icon color="#ABCDEF" />);
      expect(JSON.stringify(view.toJSON())).toContain('#ABCDEF');
      view.unmount();
    },
  );
});

describe('EyeIcon', () => {
  it('renders a different tree crossed vs uncrossed (the slash)', () => {
    const crossed = render(<Icons.EyeIcon crossed />);
    const crossedJson = JSON.stringify(crossed.toJSON());
    crossed.unmount();

    const open = render(<Icons.EyeIcon crossed={false} />);
    expect(JSON.stringify(open.toJSON())).not.toBe(crossedJson);
  });

  it('defaults to crossed', () => {
    const def = render(<Icons.EyeIcon />);
    const defJson = JSON.stringify(def.toJSON());
    def.unmount();

    const crossed = render(<Icons.EyeIcon crossed />);
    expect(JSON.stringify(crossed.toJSON())).toBe(defJson);
  });
});

describe('LockIcon', () => {
  it('uses its default grey when no colour is given', () => {
    const view = render(<Icons.LockIcon />);
    expect(JSON.stringify(view.toJSON())).toContain('#3A3A3A');
  });
});
