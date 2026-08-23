import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { Ring } from '../../src/components/Ring';
import { ProgressRing } from '../../src/components/ProgressRing';
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

/** Every numeric style value anywhere in the tree, for NaN screening. */
function allNumericStyleValues(): number[] {
  const out: number[] = [];
  for (const node of screen.UNSAFE_getAllByType(View as never)) {
    for (const v of Object.values(flatten(node.props.style))) {
      if (typeof v === 'number') out.push(v);
    }
    // transform: [{ rotate: '-180deg' }] etc.
    const t = flatten(node.props.style).transform;
    if (Array.isArray(t)) {
      for (const step of t) {
        for (const v of Object.values(step as Record<string, unknown>)) {
          if (typeof v === 'number') out.push(v);
        }
      }
    }
  }
  return out;
}

function assertNoNaN() {
  for (const n of allNumericStyleValues()) {
    expect(Number.isNaN(n)).toBe(false);
  }
  // Rotations are strings like "-90deg"; none may contain NaN.
  for (const node of screen.UNSAFE_getAllByType(View as never)) {
    const t = flatten(node.props.style).transform;
    if (Array.isArray(t)) {
      expect(JSON.stringify(t)).not.toMatch(/NaN/);
    }
  }
}

describe('Ring', () => {
  it('renders its label and value', () => {
    render(<Ring value={12} label="Sets" />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Sets')).toBeTruthy();
  });

  it('renders the "- -" placeholder for a null value', () => {
    render(<Ring value={null} label="Sets" />);
    expect(screen.getByText('- -')).toBeTruthy();
  });

  it('greys the placeholder and whitens a real value', () => {
    const { rerender } = render(<Ring value={null} label="Sets" />);
    expect(flatten(screen.getByText('- -').props.style).color).toBe('#5A5A5A');

    rerender(<Ring value={5} label="Sets" />);
    expect(flatten(screen.getByText('5').props.style).color).toBe(colors.text);
  });

  it.each(['grid', 'hero'] as const)('renders the %s variant without NaN', (variant) => {
    render(<Ring value={7} label="Sets" variant={variant} />);
    assertNoNaN();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('renders an editable TextInput when onChange is supplied', () => {
    const onChange = jest.fn();
    render(<Ring value={3} label="Sets" onChange={onChange} />);

    const input = screen.getByLabelText('Sets');
    fireEvent.changeText(input, '42');
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('strips non-digits and reports null for an empty entry', () => {
    const onChange = jest.fn();
    render(<Ring value={3} label="Sets" onChange={onChange} />);
    const input = screen.getByLabelText('Sets');

    fireEvent.changeText(input, '1a2');
    expect(onChange).toHaveBeenCalledWith(12);

    fireEvent.changeText(input, 'abc');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders the over-range gradient only when overRange is set', () => {
    const { rerender, toJSON } = render(<Ring value={99} label="Sets" />);
    const plain = JSON.stringify(toJSON());

    rerender(<Ring value={99} label="Sets" overRange />);
    expect(JSON.stringify(toJSON())).not.toBe(plain);
    assertNoNaN();
  });

  it('renders the ellipsis affordance only when onEllipsis is given', () => {
    const onEllipsis = jest.fn();
    render(<Ring value={1} label="Sets" onEllipsis={onEllipsis} />);

    fireEvent.press(screen.getByLabelText('More about Sets'));
    expect(onEllipsis).toHaveBeenCalled();
  });

  it('omits the ellipsis when no handler is given', () => {
    render(<Ring value={1} label="Sets" />);
    expect(screen.queryByLabelText('More about Sets')).toBeNull();
  });
});

describe('ProgressRing', () => {
  const base = { label: 'Sets', min: 0, max: 100 } as const;

  it.each([
    ['0%', 0],
    ['50%', 50],
    ['100%', 100],
  ])('renders at %s without NaN', (_name, value) => {
    render(<ProgressRing {...base} value={value} />);
    expect(screen.getByText(String(value))).toBeTruthy();
    assertNoNaN();
  });

  it('draws no arc at 0%', () => {
    const { toJSON } = render(<ProgressRing {...base} value={0} />);
    // pct === 0 short-circuits both halves, so only the track View is drawn.
    expect(JSON.stringify(toJSON())).not.toMatch(/rotate/);
  });

  it('draws one arc half at 50%', () => {
    const { toJSON } = render(<ProgressRing {...base} value={50} />);
    const rotations = JSON.stringify(toJSON()).match(/"rotate":"[^"]+"/g) ?? [];
    expect(rotations).toHaveLength(1);
    // 0.5 * 2 * 180 - 180 === 0deg
    expect(rotations[0]).toContain('0deg');
  });

  it('draws both arc halves at 100%', () => {
    const { toJSON } = render(<ProgressRing {...base} value={100} />);
    const rotations = JSON.stringify(toJSON()).match(/"rotate":"[^"]+"/g) ?? [];
    expect(rotations).toHaveLength(2);
    expect(JSON.stringify(rotations)).not.toMatch(/NaN/);
  });

  describe('clamping', () => {
    it('clamps a negative value to 0% (no arc, no NaN)', () => {
      const { toJSON } = render(<ProgressRing {...base} value={-40} />);
      expect(JSON.stringify(toJSON())).not.toMatch(/rotate/);
      expect(screen.getByText('-40')).toBeTruthy();
      assertNoNaN();
    });

    it('clamps a value above max to 100% — the same arcs as exactly 100', () => {
      const over = render(<ProgressRing {...base} value={400} />);
      const overRotations =
        JSON.stringify(over.toJSON()).match(/"rotate":"[^"]+"/g) ?? [];
      over.unmount();

      const at = render(<ProgressRing {...base} value={100} />);
      const atRotations =
        JSON.stringify(at.toJSON()).match(/"rotate":"[^"]+"/g) ?? [];

      expect(overRotations).toEqual(atRotations);
      expect(JSON.stringify(overRotations)).not.toMatch(/NaN/);
    });

    it('treats a zero/inverted span as 0% rather than dividing by zero', () => {
      render(<ProgressRing label="Sets" min={50} max={50} value={50} />);
      assertNoNaN();
      expect(screen.getByText('50')).toBeTruthy();

      screen.unmount();
      render(<ProgressRing label="Sets" min={100} max={0} value={50} />);
      assertNoNaN();
    });

    it('renders the null placeholder at 0% with no arc', () => {
      const { toJSON } = render(<ProgressRing {...base} value={null} />);
      expect(screen.getByText('- -')).toBeTruthy();
      expect(JSON.stringify(toJSON())).not.toMatch(/rotate/);
    });
  });

  it('tints the arc red once the value passes overAt', () => {
    const under = render(<ProgressRing {...base} value={30} overAt={50} />);
    expect(JSON.stringify(under.toJSON())).toContain(colors.orange);
    under.unmount();

    render(<ProgressRing {...base} value={80} overAt={50} />);
    expect(JSON.stringify(screen.toJSON())).toContain(colors.red);
  });

  it('scales with the size prop without producing NaN', () => {
    for (const size of [40, 132, 300]) {
      const view = render(<ProgressRing {...base} value={62} size={size} />);
      assertNoNaN();
      view.unmount();
    }
  });

  it('is editable when onChange is supplied', () => {
    const onChange = jest.fn();
    render(<ProgressRing {...base} value={10} onChange={onChange} />);

    fireEvent.changeText(screen.getByLabelText('Sets'), '55');
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it('renders the ellipsis affordance when onEllipsis is given', () => {
    const onEllipsis = jest.fn();
    render(<ProgressRing {...base} value={10} onEllipsis={onEllipsis} />);

    fireEvent.press(screen.getByLabelText('More about Sets'));
    expect(onEllipsis).toHaveBeenCalled();
  });
});
