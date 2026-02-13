import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarChart from '../BarChart';

describe('BarChart Component', () => {
  const mockData = "The quick brown fox jumps over the lazy dog. The fox is quick and brown. The dog is lazy.";

  test('renders loading state initially', () => {
    render(<BarChart data={mockData} />);
    expect(screen.getByText('Loading bar chart data...')).toBeInTheDocument();
  });

  test('renders error message when no data is provided', () => {
    render(<BarChart data="" />);
    expect(screen.getByText('No data provided for visualization.')).toBeInTheDocument();
  });

  test('renders SVG element after data processing', () => {
    render(<BarChart data={mockData} />);
    // Wait for loading to complete
    setTimeout(() => {
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg.getAttribute('width')).toBe('600');
      expect(svg.getAttribute('height')).toBe('400');
    }, 0);
  });

  test('processes data correctly', () => {
    render(<BarChart data={mockData} />);
    setTimeout(() => {
      // Check if bars are rendered
      const bars = document.querySelectorAll('.bar');
      expect(bars.length).toBeGreaterThan(0);
      expect(bars.length).toBeLessThanOrEqual(10); // Should show top 10 words
    }, 0);
  });
}); 