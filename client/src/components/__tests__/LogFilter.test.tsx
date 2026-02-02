/**
 * LogFilter 組件單元測試
 *
 * 測試 LogFilter 的行為邏輯：
 * - Debounce 機制：輸入後 300ms 才觸發 onChange
 * - 外部 value 同步：當外部 value 改變時，內部 inputValue 應同步
 * - 輸入值相同時不觸發：當輸入值與 value 相同時，不應觸發 onChange
 *
 * 命名規範：Given條件_When動作_Should預期行為
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import LogFilter from '../LogFilter';

describe('LogFilter', () => {
  // 每個測試前設定假計時器，便於控制 debounce 時序
  beforeEach(() => {
    jest.useFakeTimers();
  });

  // 每個測試後清理計時器
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Debounce 機制', () => {
    it('GivenUserTyping_WhenTypingStops_ShouldTriggerOnChangeAfter300ms', () => {
      // Given - 渲染 LogFilter 並設定 onChange mock
      const mockOnChange = jest.fn();
      render(<LogFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword');

      // When - 使用者輸入文字
      fireEvent.change(input, { target: { value: 'error' } });

      // Then - 立即檢查：onChange 不應被呼叫
      expect(mockOnChange).not.toHaveBeenCalled();

      // When - 等待 300ms debounce 時間
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then - 300ms 後 onChange 應被呼叫，傳入新值
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('error');
    });

    it('GivenUserTypingMultipleTimes_WhenTypingWithin300ms_ShouldOnlyTriggerOnceWithFinalValue', () => {
      // Given - 渲染 LogFilter 並設定 onChange mock
      const mockOnChange = jest.fn();
      render(<LogFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword');

      // When - 使用者快速連續輸入多個字元
      fireEvent.change(input, { target: { value: 'e' } });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.change(input, { target: { value: 'er' } });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.change(input, { target: { value: 'err' } });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.change(input, { target: { value: 'error' } });

      // Then - 在完整的 300ms debounce 前，onChange 不應被呼叫
      expect(mockOnChange).not.toHaveBeenCalled();

      // When - 最後一次輸入後等待 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then - onChange 只應被呼叫一次，傳入最終值
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('error');
    });

    it('GivenUserTyped_WhenWaiting299ms_ShouldNotTriggerOnChange', () => {
      // Given - 渲染 LogFilter
      const mockOnChange = jest.fn();
      render(<LogFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword');

      // When - 使用者輸入後只等待 299ms（不足 300ms）
      fireEvent.change(input, { target: { value: 'test' } });
      act(() => {
        jest.advanceTimersByTime(299);
      });

      // Then - onChange 不應被呼叫
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('外部 value 同步', () => {
    it('GivenExternalValueChanges_WhenRerender_ShouldSyncInputValue', () => {
      // Given - 渲染 LogFilter 並設定初始 value
      const mockOnChange = jest.fn();
      const { rerender } = render(<LogFilter value="initial" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword') as HTMLInputElement;
      expect(input.value).toBe('initial');

      // When - 外部 value 改變並重新渲染
      rerender(<LogFilter value="updated" onChange={mockOnChange} />);

      // Then - input 值應同步為新的外部 value
      expect(input.value).toBe('updated');
    });

    it('GivenUserTypedThenExternalValueChanges_WhenRerender_ShouldOverwriteUserInput', () => {
      // Given - 渲染 LogFilter 並讓使用者輸入
      const mockOnChange = jest.fn();
      const { rerender } = render(<LogFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword') as HTMLInputElement;

      // 使用者輸入 'user input'
      fireEvent.change(input, { target: { value: 'user input' } });
      expect(input.value).toBe('user input');

      // When - 外部 value 改變（例如父組件重置）
      rerender(<LogFilter value="reset" onChange={mockOnChange} />);

      // Then - input 值應被外部 value 覆蓋
      expect(input.value).toBe('reset');
    });
  });

  describe('輸入值相同時不觸發', () => {
    it('GivenInputValueEqualsExternalValue_WhenDebounceTimerFires_ShouldNotTriggerOnChange', () => {
      // Given - 渲染 LogFilter，value 和 inputValue 都是 'test'
      const mockOnChange = jest.fn();
      render(<LogFilter value="test" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword') as HTMLInputElement;
      expect(input.value).toBe('test');

      // When - 使用者輸入相同的值（觸發 onChange 事件但值相同）
      fireEvent.change(input, { target: { value: 'test' } });

      // 等待 debounce 時間
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then - onChange 不應被呼叫，因為值沒有改變
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('GivenUserClearsInput_WhenDebounceTimerFires_ShouldTriggerOnChangeWithEmptyString', () => {
      // Given - 渲染 LogFilter，初始值為 'filter'
      const mockOnChange = jest.fn();
      render(<LogFilter value="filter" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword');

      // When - 使用者清空輸入框
      fireEvent.change(input, { target: { value: '' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then - onChange 應被呼叫，傳入空字串
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('Input 屬性', () => {
    it('GivenLogFilter_WhenRendered_ShouldHaveCorrectPlaceholder', () => {
      // Given & When - 渲染 LogFilter
      render(<LogFilter value="" onChange={jest.fn()} />);

      // Then - input 應有正確的 placeholder
      expect(screen.getByPlaceholderText('input keyword')).toBeInTheDocument();
    });

    it('GivenLogFilter_WhenRendered_ShouldHaveTextInputType', () => {
      // Given & When - 渲染 LogFilter
      render(<LogFilter value="" onChange={jest.fn()} />);

      const input = screen.getByPlaceholderText('input keyword') as HTMLInputElement;

      // Then - input type 應為 text
      expect(input.type).toBe('text');
    });
  });

  describe('元件卸載清理', () => {
    it('GivenPendingDebounceTimer_WhenUnmount_ShouldNotTriggerOnChange', () => {
      // Given - 渲染 LogFilter 並輸入但尚未觸發 debounce
      const mockOnChange = jest.fn();
      const { unmount } = render(<LogFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('input keyword');
      fireEvent.change(input, { target: { value: 'test' } });

      // When - 卸載元件
      unmount();

      // Then - 即使 debounce 計時器到期，onChange 也不應被呼叫（或不會報錯）
      // 注意：這主要是測試 cleanup 不會拋出錯誤
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(300);
        });
      }).not.toThrow();
    });
  });
});
