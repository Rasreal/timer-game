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

/** Walks up from `node` looking for `ancestor`. */
function isDescendantOf(node: any, ancestor: any): boolean {
  let cur = node?.parent;
  while (cur) {
    if (cur === ancestor) return true;
    cur = cur.parent;
  }
  return false;
}

/**
 * The absolutely-positioned holder between the ellipsis and the ring — this is
 * the wrapper that embeds the dots in the bottom of the circle.
 */
function findAbsoluteBottomAncestorStyle(node: any, stopAt: any): unknown {
  let cur = node?.parent;
  while (cur && cur !== stopAt) {
    const st = flatten(cur.props?.style);
    if (st.position === 'absolute' && st.bottom !== undefined) return cur.props.style;
    cur = cur.parent;
  }
  return {};
}

/** The Pressable wrapping the number field — the inner typing tap area. */
function innerTapArea(input: any, ring: any): Record<string, unknown> {
  let cur = input?.parent;
  while (cur && cur !== ring) {
    if (cur.props?.onPress || cur.props?.onStartShouldSetResponder) {
      return flatten(cur.props.style);
    }
    cur = cur.parent;
  }
  return {};
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
    expect(screen.queryByLabelText('Sets ring')).toBeNull();
  });

  describe('embedded ellipsis + ring press target', () => {
    it.each(['grid', 'hero'] as const)(
      'nests the ellipsis inside the ring circle on the %s variant',
      (variant) => {
        render(
          <Ring value={1} label="Sets" variant={variant} onEllipsis={jest.fn()} />,
        );

        const ring = screen.getByLabelText('Sets ring');
        const ellipsis = screen.getByLabelText('More about Sets');

        // Not a sibling below the circle any more — a descendant of it.
        expect(isDescendantOf(ellipsis, ring)).toBe(true);
      },
    );

    it.each(['grid', 'hero'] as const)(
      'positions the ellipsis absolutely against the bottom edge (%s)',
      (variant) => {
        render(
          <Ring value={1} label="Sets" variant={variant} onEllipsis={jest.fn()} />,
        );

        const holder = screen.getByLabelText('More about Sets').parent;
        const style = flatten(findAbsoluteBottomAncestorStyle(
          screen.getByLabelText('More about Sets'),
          screen.getByLabelText('Sets ring'),
        ));
        expect(holder).toBeTruthy();
        expect(style.position).toBe('absolute');
        expect(typeof style.bottom).toBe('number');
        // Inside the ring, not hanging off the bottom of it.
        expect(style.bottom as number).toBeGreaterThan(0);
        expect(style.marginTop).toBeUndefined();
      },
    );

    it.each(['grid', 'hero'] as const)(
      'fires onEllipsis when the ring graphic itself is pressed (%s)',
      (variant) => {
        const onEllipsis = jest.fn();
        render(
          <Ring
            value={1}
            label="Sets"
            variant={variant}
            onEllipsis={onEllipsis}
          />,
        );

        fireEvent.press(screen.getByLabelText('Sets ring'));
        expect(onEllipsis).toHaveBeenCalledTimes(1);
      },
    );

    it('still fires onEllipsis from the embedded ellipsis itself', () => {
      const onEllipsis = jest.fn();
      render(<Ring value={1} label="Sets" onEllipsis={onEllipsis} />);

      fireEvent.press(screen.getByLabelText('More about Sets'));
      expect(onEllipsis).toHaveBeenCalledTimes(1);
    });

    it.each(['grid', 'hero'] as const)(
      'does not fire onEllipsis when the inner number field is used (%s)',
      (variant) => {
        const onEllipsis = jest.fn();
        const onChange = jest.fn();
        render(
          <Ring
            value={3}
            label="Sets"
            variant={variant}
            onChange={onChange}
            onEllipsis={onEllipsis}
          />,
        );

        const input = screen.getByLabelText('Sets');
        fireEvent(input, 'focus');
        fireEvent.press(input);
        fireEvent.changeText(input, '42');

        expect(onChange).toHaveBeenCalledWith(42);
        expect(onEllipsis).not.toHaveBeenCalled();
      },
    );

    it.each(['grid', 'hero'] as const)(
      'the inner tap area does not blanket the whole ring (%s)',
      (variant) => {
        render(
          <Ring
            value={3}
            label="Sets"
            variant={variant}
            onChange={jest.fn()}
            onEllipsis={jest.fn()}
          />,
        );

        const size = variant === 'hero' ? 236 : 132;
        const area = innerTapArea(
          screen.getByLabelText('Sets'),
          screen.getByLabelText('Sets ring'),
        );

        // If it filled the circle it would swallow every annulus press and the
        // ring would stop opening the support screen on a real device.
        expect(area.width).toBeDefined();
        expect(area.width as number).toBeLessThan(size);
        expect(Object.keys(area)).not.toContain('position');
      },
    );

    it('keeps the inner typing target large and clear of the ellipsis', () => {
      render(
        <Ring value={3} label="Sets" onChange={jest.fn()} onEllipsis={jest.fn()} />,
      );

      const input = flatten(screen.getByLabelText('Sets').props.style);
      // A comfortable tap target for the number, per the design.
      expect(input.width as number).toBeGreaterThanOrEqual(100);
      expect(input.height as number).toBeGreaterThanOrEqual(44);
    });

    it('the ring press target is a button, distinct from the number field', () => {
      render(
        <Ring value={3} label="Sets" onChange={jest.fn()} onEllipsis={jest.fn()} />,
      );

      const ring = screen.getByLabelText('Sets ring');
      expect(ring.props.accessibilityRole ?? ring.props.role).toBe('button');
      // The two labels must stay distinct or every a11y query goes ambiguous.
      expect(screen.getByLabelText('Sets')).not.toBe(ring);
      expect(screen.getByLabelText('More about Sets')).not.toBe(ring);
    });
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

  describe('embedded ellipsis + ring press target', () => {
    it('nests the ellipsis inside the ring circle', () => {
      render(<ProgressRing {...base} value={10} onEllipsis={jest.fn()} />);

      expect(
        isDescendantOf(
          screen.getByLabelText('More about Sets'),
          screen.getByLabelText('Sets ring'),
        ),
      ).toBe(true);
    });

    it('positions the ellipsis absolutely against the bottom edge', () => {
      render(<ProgressRing {...base} value={10} onEllipsis={jest.fn()} />);

      const style = flatten(
        findAbsoluteBottomAncestorStyle(
          screen.getByLabelText('More about Sets'),
          screen.getByLabelText('Sets ring'),
        ),
      );
      expect(style.position).toBe('absolute');
      expect(style.bottom as number).toBeGreaterThan(0);
      expect(style.marginTop).toBeUndefined();
    });

    it('fires onEllipsis when the ring graphic itself is pressed', () => {
      const onEllipsis = jest.fn();
      render(<ProgressRing {...base} value={10} onEllipsis={onEllipsis} />);

      fireEvent.press(screen.getByLabelText('Sets ring'));
      expect(onEllipsis).toHaveBeenCalledTimes(1);
    });

    it('does not fire onEllipsis when the inner number field is used', () => {
      const onEllipsis = jest.fn();
      const onChange = jest.fn();
      render(
        <ProgressRing
          {...base}
          value={10}
          onChange={onChange}
          onEllipsis={onEllipsis}
        />,
      );

      const input = screen.getByLabelText('Sets');
      fireEvent(input, 'focus');
      fireEvent.press(input);
      fireEvent.changeText(input, '55');

      expect(onChange).toHaveBeenCalledWith(55);
      expect(onEllipsis).not.toHaveBeenCalled();
    });

    it('omits both press targets when no handler is given', () => {
      render(<ProgressRing {...base} value={10} />);
      expect(screen.queryByLabelText('More about Sets')).toBeNull();
      expect(screen.queryByLabelText('Sets ring')).toBeNull();
    });

    it('the inner tap area is inset, not a blanket over the whole ring', () => {
      const size = 132;
      render(
        <ProgressRing
          {...base}
          value={10}
          size={size}
          onChange={jest.fn()}
          onEllipsis={jest.fn()}
        />,
      );

      const area = innerTapArea(
        screen.getByLabelText('Sets'),
        screen.getByLabelText('Sets ring'),
      );

      // An absolute fill with 0 insets would swallow every annulus press.
      expect(area.position).toBe('absolute');
      for (const edge of ['top', 'left', 'right', 'bottom'] as const) {
        expect(typeof area[edge]).toBe('number');
        expect(area[edge] as number).toBeGreaterThan(0);
      }
      // Still a comfortable target for typing.
      expect(size - 2 * (area.top as number)).toBeGreaterThanOrEqual(44);
    });

    it('scales the embedded ellipsis with the ring size', () => {
      const small = render(
        <ProgressRing {...base} value={10} size={90} onEllipsis={jest.fn()} />,
      );
      const smallStyle = flatten(
        findAbsoluteBottomAncestorStyle(
          screen.getByLabelText('More about Sets'),
          screen.getByLabelText('Sets ring'),
        ),
      );
      small.unmount();

      render(<ProgressRing {...base} value={10} size={300} onEllipsis={jest.fn()} />);
      const bigStyle = flatten(
        findAbsoluteBottomAncestorStyle(
          screen.getByLabelText('More about Sets'),
          screen.getByLabelText('Sets ring'),
        ),
      );

      expect(bigStyle.bottom as number).toBeGreaterThan(smallStyle.bottom as number);
      assertNoNaN();
    });
  });
});
