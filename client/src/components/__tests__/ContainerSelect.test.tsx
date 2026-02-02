/**
 * ContainerSelect 組件單元測試
 *
 * 測試 ContainerSelect 的行為邏輯：
 * - 選中容器的查找邏輯
 * - 容器狀態顯示（running/stopped）
 * - 空狀態處理
 * - onChange 回調
 *
 * 命名規範：Given條件_When動作_Should預期行為
 *
 * 注意：此組件使用 Headless UI 的 Listbox，測試聚焦於行為而非實作細節
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ContainerSelect from '../ContainerSelect';
import type { Container } from '../../types';

// 測試用的 Container 資料工廠
const createContainer = (
  overrides: Partial<Container> = {}
): Container => ({
  id: 'container-1',
  name: 'test-container',
  image: 'nginx:latest',
  status: 'Up 2 hours',
  state: 'running',
  ...overrides,
});

describe('ContainerSelect', () => {
  describe('選中容器顯示', () => {
    it('GivenValueMatchesContainer_WhenRendered_ShouldDisplaySelectedContainerName', () => {
      // Given - containers 陣列中有對應 value 的容器
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'frontend-app', state: 'running' }),
        createContainer({ id: 'c2', name: 'backend-api', state: 'running' }),
      ];

      // When - 渲染 ContainerSelect，value 對應 c1
      render(
        <ContainerSelect
          containers={containers}
          value="c1"
          onChange={jest.fn()}
        />
      );

      // Then - 應顯示選中容器的名稱
      expect(screen.getByText(/frontend-app/)).toBeInTheDocument();
    });

    it('GivenValueNotMatchAnyContainer_WhenRendered_ShouldDisplayPlaceholder', () => {
      // Given - containers 陣列中沒有對應 value 的容器
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'frontend-app' }),
      ];

      // When - 渲染 ContainerSelect，value 不存在
      render(
        <ContainerSelect
          containers={containers}
          value="non-existent-id"
          onChange={jest.fn()}
        />
      );

      // Then - 應顯示 placeholder
      expect(screen.getByText('Select container...')).toBeInTheDocument();
    });

    it('GivenEmptyContainers_WhenRendered_ShouldDisplayPlaceholder', () => {
      // Given - containers 為空陣列
      const containers: Container[] = [];

      // When - 渲染 ContainerSelect
      render(
        <ContainerSelect
          containers={containers}
          value=""
          onChange={jest.fn()}
        />
      );

      // Then - 應顯示 placeholder
      expect(screen.getByText('Select container...')).toBeInTheDocument();
    });

    it('GivenEmptyValue_WhenRendered_ShouldDisplayPlaceholder', () => {
      // Given - value 為空字串
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'test-container' }),
      ];

      // When - 渲染 ContainerSelect，value 為空
      render(
        <ContainerSelect
          containers={containers}
          value=""
          onChange={jest.fn()}
        />
      );

      // Then - 應顯示 placeholder
      expect(screen.getByText('Select container...')).toBeInTheDocument();
    });
  });

  describe('容器狀態圖示', () => {
    it('GivenRunningContainer_WhenRendered_ShouldShowGreenIndicator', () => {
      // Given - 選中的容器狀態為 running
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'running-container', state: 'running' }),
      ];

      // When - 渲染 ContainerSelect
      render(
        <ContainerSelect
          containers={containers}
          value="c1"
          onChange={jest.fn()}
        />
      );

      // Then - 應顯示綠色指示燈（🟢）
      expect(screen.getByText(/🟢/)).toBeInTheDocument();
    });

    it('GivenStoppedContainer_WhenRendered_ShouldShowWhiteIndicator', () => {
      // Given - 選中的容器狀態為非 running（例如 exited）
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'stopped-container', state: 'exited' }),
      ];

      // When - 渲染 ContainerSelect
      render(
        <ContainerSelect
          containers={containers}
          value="c1"
          onChange={jest.fn()}
        />
      );

      // Then - 應顯示白色指示燈（⚪）
      expect(screen.getByText(/⚪/)).toBeInTheDocument();
    });
  });

  describe('onChange 回調', () => {
    it('GivenMultipleContainers_WhenSelectOption_ShouldCallOnChangeWithContainerId', async () => {
      // Given - 有多個容器可選
      const mockOnChange = jest.fn();
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'container-one' }),
        createContainer({ id: 'c2', name: 'container-two' }),
      ];

      // When - 渲染 ContainerSelect 並開啟下拉選單
      render(
        <ContainerSelect
          containers={containers}
          value=""
          onChange={mockOnChange}
        />
      );

      // 點擊按鈕開啟下拉選單
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // 選擇第二個選項 - 使用 role="option" 來精確定位下拉選項
      const options = await screen.findAllByRole('option');
      // 找到包含 'container-two' 的選項
      const targetOption = options.find((opt) =>
        opt.textContent?.includes('container-two')
      );
      fireEvent.click(targetOption!);

      // Then - onChange 應被呼叫，傳入選中容器的 id
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('c2');
    });

    it('GivenSelectedContainer_WhenSelectSameOption_ShouldStillCallOnChange', async () => {
      // Given - 已選中一個容器
      const mockOnChange = jest.fn();
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'container-one' }),
      ];

      // When - 再次選擇同一個選項
      render(
        <ContainerSelect
          containers={containers}
          value="c1"
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // 使用 role="option" 精確定位下拉選項，避免按鈕文字干擾
      const option = await screen.findByRole('option');
      fireEvent.click(option);

      // Then - onChange 仍應被呼叫（由呼叫端決定是否處理相同值）
      expect(mockOnChange).toHaveBeenCalledWith('c1');
    });
  });

  describe('下拉選單渲染', () => {
    it('GivenMultipleContainers_WhenOpenDropdown_ShouldDisplayAllOptions', async () => {
      // Given - 有多個容器
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'alpha-service', state: 'running' }),
        createContainer({ id: 'c2', name: 'beta-service', state: 'exited' }),
        createContainer({ id: 'c3', name: 'gamma-service', state: 'running' }),
      ];

      // When - 開啟下拉選單
      render(
        <ContainerSelect
          containers={containers}
          value=""
          onChange={jest.fn()}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Then - 所有容器選項都應顯示（使用 role="option" 取得下拉選項）
      const options = await screen.findAllByRole('option');
      expect(options).toHaveLength(3);

      // 驗證每個選項的文字內容
      const optionTexts = options.map((opt) => opt.textContent);
      expect(optionTexts.some((text) => text?.includes('alpha-service'))).toBe(true);
      expect(optionTexts.some((text) => text?.includes('beta-service'))).toBe(true);
      expect(optionTexts.some((text) => text?.includes('gamma-service'))).toBe(true);
    });

    it('GivenMixedStateContainers_WhenOpenDropdown_ShouldShowCorrectIndicators', async () => {
      // Given - 有不同狀態的容器
      const containers: Container[] = [
        createContainer({ id: 'c1', name: 'running-one', state: 'running' }),
        createContainer({ id: 'c2', name: 'stopped-one', state: 'exited' }),
      ];

      // When - 開啟下拉選單
      render(
        <ContainerSelect
          containers={containers}
          value=""
          onChange={jest.fn()}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Then - 使用 role="option" 取得下拉選項並驗證狀態指示燈
      const options = await screen.findAllByRole('option');
      expect(options).toHaveLength(2);

      // 驗證 running 容器有綠色指示燈
      const runningOption = options.find((opt) =>
        opt.textContent?.includes('running-one')
      );
      expect(runningOption?.textContent).toContain('🟢');

      // 驗證 stopped 容器有白色指示燈
      const stoppedOption = options.find((opt) =>
        opt.textContent?.includes('stopped-one')
      );
      expect(stoppedOption?.textContent).toContain('⚪');
    });
  });

  describe('查找邏輯 - 純函數測試', () => {
    /**
     * 測試 selectedContainer 查找邏輯的純函數版本
     * 這是組件內部 line 18 的邏輯：containers.find((c) => c.id === value)
     */
    const findSelectedContainer = (
      containers: Container[],
      value: string
    ): Container | undefined => {
      return containers.find((c) => c.id === value);
    };

    it('GivenContainerExists_WhenFindById_ShouldReturnContainer', () => {
      // Given - containers 陣列中有對應 id 的容器
      const containers: Container[] = [
        createContainer({ id: 'abc123', name: 'target-container' }),
        createContainer({ id: 'def456', name: 'other-container' }),
      ];

      // When - 查找特定 id
      const result = findSelectedContainer(containers, 'abc123');

      // Then - 應返回對應的容器
      expect(result).toBeDefined();
      expect(result?.name).toBe('target-container');
    });

    it('GivenContainerNotExists_WhenFindById_ShouldReturnUndefined', () => {
      // Given - containers 陣列中沒有對應 id 的容器
      const containers: Container[] = [
        createContainer({ id: 'abc123', name: 'test-container' }),
      ];

      // When - 查找不存在的 id
      const result = findSelectedContainer(containers, 'not-found-id');

      // Then - 應返回 undefined
      expect(result).toBeUndefined();
    });

    it('GivenEmptyContainers_WhenFindById_ShouldReturnUndefined', () => {
      // Given - containers 為空陣列
      const containers: Container[] = [];

      // When - 查找任意 id
      const result = findSelectedContainer(containers, 'any-id');

      // Then - 應返回 undefined
      expect(result).toBeUndefined();
    });

    it('GivenEmptyValue_WhenFindById_ShouldReturnUndefined', () => {
      // Given - value 為空字串
      const containers: Container[] = [
        createContainer({ id: 'abc123', name: 'test-container' }),
      ];

      // When - 以空字串查找
      const result = findSelectedContainer(containers, '');

      // Then - 應返回 undefined（除非有容器 id 為空字串）
      expect(result).toBeUndefined();
    });

    it('GivenDuplicateIds_WhenFindById_ShouldReturnFirstMatch', () => {
      // Given - containers 中有重複 id（異常情況，但應有確定行為）
      const containers: Container[] = [
        createContainer({ id: 'dup-id', name: 'first-container' }),
        createContainer({ id: 'dup-id', name: 'second-container' }),
      ];

      // When - 查找重複的 id
      const result = findSelectedContainer(containers, 'dup-id');

      // Then - 應返回第一個匹配的容器（Array.find 的行為）
      expect(result?.name).toBe('first-container');
    });
  });
});
