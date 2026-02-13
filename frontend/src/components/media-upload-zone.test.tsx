import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaUploadZone } from './media-upload-zone';

describe('MediaUploadZone', () => {
  it('renders drop zone text', () => {
    render(<MediaUploadZone onFilesSelected={vi.fn()} />);
    expect(screen.getByText(/Drop photos\/videos/)).toBeInTheDocument();
  });

  it('has accessible button role', () => {
    render(<MediaUploadZone onFilesSelected={vi.fn()} />);
    expect(screen.getByRole('button', { name: /upload media/i })).toBeInTheDocument();
  });

  it('calls onFilesSelected with valid files', () => {
    const onFiles = vi.fn();
    render(<MediaUploadZone onFilesSelected={onFiles} />);

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('rejects oversized files', () => {
    const onFiles = vi.fn();
    render(<MediaUploadZone onFilesSelected={onFiles} />);

    // Create a file larger than 50MB
    const bigFile = new File(['x'.repeat(100)], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 60 * 1024 * 1024 });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [bigFile] });
    fireEvent.change(input);

    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText(/File too large/)).toBeInTheDocument();
  });

  it('rejects unsupported file types', () => {
    const onFiles = vi.fn();
    render(<MediaUploadZone onFilesSelected={onFiles} />);

    const txtFile = new File(['text'], 'doc.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [txtFile] });
    fireEvent.change(input);

    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText(/Unsupported file type/)).toBeInTheDocument();
  });
});
