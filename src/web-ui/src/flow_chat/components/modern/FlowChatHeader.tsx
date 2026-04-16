/**
 * FlowChat header — turn navigation, search and BTW back controls.
 *
 * The session title and the "return to Agentic OS" button have been moved to
 * UnifiedTopBar so the whole application shares a single top chrome.
 * This component now owns only the right-side session controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, CornerUpLeft, List, Search, X } from 'lucide-react';
import { Tooltip, IconButton, Input } from '@/component-library';
import { useTranslation } from 'react-i18next';
import { globalEventBus } from '@/infrastructure/event-bus';
import { SessionFilesBadge } from './SessionFilesBadge';
import type { Session } from '../../types/flow-chat';
import { FLOWCHAT_FOCUS_ITEM_EVENT, type FlowChatFocusItemRequest } from '../../events/flowchatNavigation';
import './FlowChatHeader.scss';

export interface FlowChatHeaderTurnSummary {
  turnId: string;
  turnIndex: number;
  title: string;
}

export interface FlowChatHeaderProps {
  /** Current turn index. */
  currentTurn: number;
  /** Total turns. */
  totalTurns: number;
  /** Current user message (kept for turn list tooltip). */
  currentUserMessage: string;
  /** Whether the header is visible. */
  visible: boolean;
  /** Session ID. */
  sessionId?: string;
  /** BTW child-session origin metadata. */
  btwOrigin?: Session['btwOrigin'] | null;
  /** BTW parent session title. */
  btwParentTitle?: string;
  /** Ordered turn summaries used by header navigation. */
  turns?: FlowChatHeaderTurnSummary[];
  /** Jump to a specific turn. */
  onJumpToTurn?: (turnId: string) => void;
  /** Jump to the previous turn. */
  onJumpToPreviousTurn?: () => void;
  /** Jump to the next turn. */
  onJumpToNextTurn?: () => void;

  // ========== Search ==========
  /** Current search query string. */
  searchQuery?: string;
  /** Called when the user types in the search box. */
  onSearchChange?: (query: string) => void;
  /** Total number of search matches. */
  searchMatchCount?: number;
  /** 1-based index of the currently focused match (0 means no active match). */
  searchCurrentMatch?: number;
  /** Navigate to the next match. */
  onSearchNext?: () => void;
  /** Navigate to the previous match. */
  onSearchPrev?: () => void;
  /** Called when the user closes the search bar. */
  onSearchClose?: () => void;
  /** Increments each time the parent requests to open the search bar (e.g. Ctrl+F). */
  searchOpenRequest?: number;

  /** Turn list sidebar open state (controlled by parent). */
  turnListOpen?: boolean;
  /** Toggle or close the turn list sidebar. */
  onTurnListOpenChange?: (open: boolean) => void;
}
export const FlowChatHeader: React.FC<FlowChatHeaderProps> = ({
  currentTurn,
  totalTurns,
  currentUserMessage: _currentUserMessage,
  visible,
  sessionId,
  btwOrigin,
  btwParentTitle = '',
  turns = [],
  onJumpToTurn,
  onJumpToPreviousTurn,
  onJumpToNextTurn,
  searchQuery = '',
  onSearchChange,
  searchMatchCount = 0,
  searchCurrentMatch = 0,
  onSearchNext,
  onSearchPrev,
  onSearchClose,
  searchOpenRequest = 0,
  turnListOpen = false,
  onTurnListOpenChange,
}) => {
  const { t } = useTranslation('flow-chat');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const parentLabel = btwParentTitle || t('btw.parent', { defaultValue: 'parent session' });
  const backTooltip = btwOrigin?.parentTurnIndex
    ? t('flowChatHeader.btwBackTooltipWithTurn', {
      title: parentLabel,
      turn: btwOrigin.parentTurnIndex,
      defaultValue: `Go back to the source session: ${parentLabel} (Turn ${btwOrigin.parentTurnIndex})`,
    })
    : t('flowChatHeader.btwBackTooltipWithoutTurn', {
      title: parentLabel,
      defaultValue: `Go back to the source session: ${parentLabel}`,
    });
  const turnListTooltip = t('flowChatHeader.turnList', {
    defaultValue: 'Turn list',
  });
  const previousTurnDisabled = currentTurn <= 1;
  const nextTurnDisabled = currentTurn <= 0 || currentTurn >= totalTurns;
  const hasTurnNavigation = turns.length > 0 && !!onJumpToTurn;

  // Sync open state from parent (e.g. Ctrl+F shortcut).
  // Using a counter so every new request opens the bar, even after a prior close.
  const prevSearchOpenRequestRef = useRef(0);
  useEffect(() => {
    if (searchOpenRequest > 0 && searchOpenRequest !== prevSearchOpenRequestRef.current) {
      prevSearchOpenRequestRef.current = searchOpenRequest;
      setIsSearchOpen(true);
    }
  }, [searchOpenRequest]);

  // Focus the search input whenever it opens.
  useEffect(() => {
    if (isSearchOpen) {
      const frameId = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
      return () => cancelAnimationFrame(frameId);
    }
    return undefined;
  }, [isSearchOpen]);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    onSearchClose?.();
  }, [onSearchClose]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        handleCloseSearch();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          onSearchPrev?.();
        } else {
          onSearchNext?.();
        }
        e.preventDefault();
      }
    },
    [handleCloseSearch, onSearchNext, onSearchPrev],
  );

  const hasNoResults = searchQuery.trim().length > 0 && searchMatchCount === 0;

  const handleBackToParent = () => {
    const parentId = btwOrigin?.parentSessionId;
    if (!parentId) return;
    const requestId = btwOrigin?.requestId;
    const itemId = requestId ? `btw_marker_${requestId}` : undefined;
    const request: FlowChatFocusItemRequest = {
      sessionId: parentId,
      turnIndex: btwOrigin?.parentTurnIndex,
      itemId,
      source: 'btw-back',
    };
    globalEventBus.emit(FLOWCHAT_FOCUS_ITEM_EVENT, request, 'FlowChatHeader');
  };

  const handleToggleTurnList = () => {
    if (!hasTurnNavigation) return;
    onTurnListOpenChange?.(!turnListOpen);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="flowchat-header">
      <div className="flowchat-header__actions flowchat-header__actions--left">
        <SessionFilesBadge sessionId={sessionId} />
      </div>

      <div className="flowchat-header__actions">
        {isSearchOpen ? (
          <div className="flowchat-header__search" role="search" data-testid="flowchat-header-search-bar">
            <Input
              ref={searchInputRef}
              className="flowchat-header__search-field"
              variant="filled"
              inputSize="small"
              prefix={<Search size={12} className="flowchat-header__search-prefix-icon" aria-hidden="true" />}
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange?.(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('flowChatHeader.searchPlaceholder', { defaultValue: 'Search messages' })}
              aria-label={t('flowChatHeader.searchPlaceholder', { defaultValue: 'Search messages' })}
              error={hasNoResults}
            />
            <span className="flowchat-header__search-count" aria-live="polite">
              {searchQuery.trim()
                ? hasNoResults
                  ? t('flowChatHeader.searchNoResults', { defaultValue: 'No results' })
                  : t('flowChatHeader.searchResult', {
                      current: searchCurrentMatch,
                      total: searchMatchCount,
                      defaultValue: `${searchCurrentMatch} / ${searchMatchCount}`,
                    })
                : null}
            </span>
            <IconButton
              variant="ghost"
              size="xs"
              onClick={onSearchPrev}
              disabled={searchMatchCount === 0}
              tooltip={t('flowChatHeader.searchPrevious', { defaultValue: 'Previous match' })}
              aria-label={t('flowChatHeader.searchPrevious', { defaultValue: 'Previous match' })}
            >
              <ChevronUp size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="xs"
              onClick={onSearchNext}
              disabled={searchMatchCount === 0}
              tooltip={t('flowChatHeader.searchNext', { defaultValue: 'Next match' })}
              aria-label={t('flowChatHeader.searchNext', { defaultValue: 'Next match' })}
            >
              <ChevronDown size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="xs"
              onClick={handleCloseSearch}
              tooltip={t('flowChatHeader.searchClose', { defaultValue: 'Close search' })}
              aria-label={t('flowChatHeader.searchClose', { defaultValue: 'Close search' })}
            >
              <X size={14} />
            </IconButton>
          </div>
        ) : null}
        {!isSearchOpen && (
          <IconButton
            className="flowchat-header__search-btn"
            variant="ghost"
            size="xs"
            onClick={handleOpenSearch}
            tooltip={t('flowChatHeader.searchOpen', { defaultValue: 'Search messages' })}
            aria-label={t('flowChatHeader.searchOpen', { defaultValue: 'Search messages' })}
            data-testid="flowchat-header-search"
          >
            <Search size={14} />
          </IconButton>
        )}
        {!isSearchOpen && (
          <div className="flowchat-header__turn-steppers">
            <IconButton
              className="flowchat-header__turn-nav-button"
              variant="ghost"
              size="xs"
              onClick={onJumpToPreviousTurn}
              tooltip={t('flowChatHeader.previousTurn', { defaultValue: 'Previous turn' })}
              disabled={previousTurnDisabled || !onJumpToPreviousTurn}
              aria-label={t('flowChatHeader.previousTurn', { defaultValue: 'Previous turn' })}
              data-testid="flowchat-header-turn-prev"
            >
              <ChevronUp size={14} />
            </IconButton>
            <IconButton
              className="flowchat-header__turn-nav-button"
              variant="ghost"
              size="xs"
              onClick={onJumpToNextTurn}
              tooltip={t('flowChatHeader.nextTurn', { defaultValue: 'Next turn' })}
              disabled={nextTurnDisabled || !onJumpToNextTurn}
              aria-label={t('flowChatHeader.nextTurn', { defaultValue: 'Next turn' })}
              data-testid="flowchat-header-turn-next"
            >
              <ChevronDown size={14} />
            </IconButton>
          </div>
        )}
        {!!btwOrigin?.parentSessionId && (
          <IconButton
            className="flowchat-header__btw-back"
            variant="ghost"
            size="xs"
            onClick={handleBackToParent}
            tooltip={backTooltip}
            disabled={!btwOrigin.parentSessionId}
            aria-label={t('btw.back', { defaultValue: 'Back' })}
            data-testid="flowchat-header-btw-back"
          >
            <CornerUpLeft size={12} />
          </IconButton>
        )}
        {!isSearchOpen && (
          <div className="flowchat-header__turn-nav">
            <IconButton
              className={`flowchat-header__turn-nav-button${turnListOpen ? ' flowchat-header__turn-nav-button--active' : ''}`}
              variant="ghost"
              size="xs"
              onClick={handleToggleTurnList}
              tooltip={turnListTooltip}
              disabled={!hasTurnNavigation}
              aria-label={turnListTooltip}
              aria-expanded={turnListOpen}
              aria-controls="flowchat-turn-list-sidebar"
              data-testid="flowchat-header-turn-list"
            >
              <List size={14} />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
};

FlowChatHeader.displayName = 'FlowChatHeader';

