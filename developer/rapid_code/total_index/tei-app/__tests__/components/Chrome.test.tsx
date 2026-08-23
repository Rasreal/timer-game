import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import {
  BackArrow,
  BrandLockup,
  DarkButton,
  Divider,
  Ellipsis,
  OutlineButton,
  ScreenBody,
  TeiLockup,
  Toast,
} from '../../src/components/Chrome';
import { colors } from '../../src/theme';

jest.mock('../../src/lib/supabase');

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, s) => ({ ...acc, ...flatten(s) }),
      {},
    );
  }
  return (style as Record<string, unknown>) ?? {};
}

describe('BrandLockup (header)', () => {
  it('renders the tagline and the RHIN/ATHLETICS wordmark', () => {
    render(<BrandLockup />);
    expect(screen.getByText(/Mission\./)).toBeTruthy();
    expect(screen.getByText('Simple.')).toBeTruthy();
    expect(screen.getByText('RHIN')).toBeTruthy();
    expect(screen.getByText('ATHLETICS')).toBeTruthy();
  });

  it('switches the wordmark colour in the light variant', () => {
    const dark = render(<BrandLockup />);
    expect(flatten(dark.getByText('RHIN').props.style).color).toBe('#3D3D3D');
    dark.unmount();

    render(<BrandLockup light />);
    expect(flatten(screen.getByText('RHIN').props.style).color).toBe('#6B6B6B');
  });

  it('honours the size prop', () => {
    render(<BrandLockup size={50} />);
    expect(flatten(screen.getByText(/Mission\./).props.style).fontSize).toBe(50);
  });
});

describe('TeiLockup (header)', () => {
  it('renders both lines', () => {
    render(<TeiLockup />);
    expect(screen.getByText('TOTAL EFFECT INDEX')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
  });

  it.each([
    ['sm', 13, 30],
    ['md', 19, 46],
  ] as const)('sizes the %s variant', (size, labelSize, teiSize) => {
    render(<TeiLockup size={size} />);
    expect(
      flatten(screen.getByText('TOTAL EFFECT INDEX').props.style).fontSize,
    ).toBe(labelSize);
    expect(flatten(screen.getByText('TEI').props.style).fontSize).toBe(teiSize);
  });

  it('accepts a custom TEI colour', () => {
    render(<TeiLockup teiColor={colors.orange} />);
    expect(flatten(screen.getByText('TEI').props.style).color).toBe(colors.orange);
  });
});

describe('BackArrow (nav)', () => {
  it('renders a labelled back button with the chevron glyph', () => {
    render(<BackArrow onPress={jest.fn()} />);
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.getByText('‹')).toBeTruthy();
  });

  it('calls its handler on press', () => {
    const onPress = jest.fn();
    render(<BackArrow onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('wired to router.back, it calls router.back', () => {
    render(<BackArrow onPress={() => router.back()} />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('defaults to the orange tint and accepts an override', () => {
    const d = render(<BackArrow onPress={jest.fn()} />);
    expect(flatten(d.getByText('‹').props.style).color).toBe(colors.orange);
    d.unmount();

    render(<BackArrow onPress={jest.fn()} color="#F5B078" />);
    expect(flatten(screen.getByText('‹').props.style).color).toBe('#F5B078');
  });
});

describe('Ellipsis', () => {
  it('renders with its accessibility label and fires on press', () => {
    const onPress = jest.fn();
    render(<Ellipsis onPress={onPress} label="More about Sets" />);

    fireEvent.press(screen.getByLabelText('More about Sets'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('•••')).toBeTruthy();
  });

  it('honours colour and size overrides', () => {
    render(<Ellipsis onPress={jest.fn()} label="x" color="#999" size={18} />);
    const style = flatten(screen.getByText('•••').props.style);
    expect(style.color).toBe('#999');
    expect(style.fontSize).toBe(18);
  });
});

describe('OutlineButton', () => {
  it('renders its title and fires on press', () => {
    const onPress = jest.fn();
    render(<OutlineButton title="Continue →" onPress={onPress} />);

    fireEvent.press(screen.getByText('Continue →'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled, and dims the label', () => {
    const onPress = jest.fn();
    render(<OutlineButton title="Continue" onPress={onPress} disabled />);

    fireEvent.press(screen.getByText('Continue'));
    expect(onPress).not.toHaveBeenCalled();
    expect(flatten(screen.getByText('Continue').props.style).color).toBe('#5A5A5A');
  });

  it('honours the fontSize prop', () => {
    render(<OutlineButton title="Big" onPress={jest.fn()} fontSize={21} />);
    expect(flatten(screen.getByText('Big').props.style).fontSize).toBe(21);
  });
});

describe('DarkButton', () => {
  it('renders its title and fires on press', () => {
    const onPress = jest.fn();
    render(<DarkButton title="Save this PLAN" onPress={onPress} />);

    fireEvent.press(screen.getByText('Save this PLAN'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const onPress = jest.fn();
    render(<DarkButton title="Saving…" onPress={onPress} disabled />);

    fireEvent.press(screen.getByText('Saving…'));
    expect(onPress).not.toHaveBeenCalled();
    expect(flatten(screen.getByText('Saving…').props.style).color).toBe('#6B6B6B');
  });
});

describe('Divider', () => {
  it('renders a 1px rule and merges a style override', () => {
    const { toJSON } = render(<Divider style={{ marginTop: 9 }} />);
    const json = toJSON() as unknown as { props: { style: unknown } };
    const style = flatten(json.props.style);
    expect(style.height).toBe(1);
    expect(style.marginTop).toBe(9);
  });
});

describe('Toast', () => {
  it('renders its message and stays pointer-transparent', () => {
    const { toJSON } = render(<Toast message="Profile saved" />);
    expect(screen.getByText('Profile saved')).toBeTruthy();
    const root = toJSON() as unknown as { props: { pointerEvents: string } };
    expect(root.props.pointerEvents).toBe(
      'none',
    );
  });
});

describe('ScreenBody', () => {
  it('renders its children inside a flex container', () => {
    render(
      <ScreenBody>
        <Text>inner</Text>
      </ScreenBody>,
    );
    expect(screen.getByText('inner')).toBeTruthy();
  });
});
