/**
 * Right-side turn list panel — pushes the message area when open.
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './FlowChatTurnListSidebar.scss';

export interface FlowChatTurnListEntry {
  turnId: string;
  turnIndex: number;
  title: string;
}

export interface FlowChatTurnListSidebarProps {
  open: boolean;
  turns: FlowChatTurnListEntry[];
  currentTurn: number;
  totalTurns: number;
  onSelectTurn: (turnId: string) => void;
  /** Dialog turns that contain the active search query (whole-turn search). */
  searchMatchedTurnIds?: ReadonlySet<string>;
}

export const FlowChatTurnListSidebar = React.forwardRef<HTMLElement, FlowChatTurnListSidebarProps>(
  function FlowChatTurnListSidebar(
    { open, turns, currentTurn, totalTurns, onSelectTurn, searchMatchedTurnIds },
    ref,
  ) {
    const { t } = useTranslation('flow-chat');
    const activeTurnItemRef = useRef<HTMLButtonElement | null>(null);
    const listTitle = t('flowChatHeader.turnList', { defaultValue: 'Turn list' });

    useEffect(() => {
      if (!open) return;

      const frameId = requestAnimationFrame(() => {
        activeTurnItemRef.current?.scrollIntoView({
          block: 'center',
          inline: 'nearest',
        });
      });

      return () => {
        cancelAnimationFrame(frameId);
      };
    }, [open, currentTurn, turns.length]);

    return (
      <aside
        id="flowchat-turn-list-sidebar"
        ref={ref}
        className={`flowchat-turn-sidebar${open ? ' flowchat-turn-sidebar--open' : ''}`}
        aria-hidden={!open}
        data-testid="flowchat-turn-list-sidebar"
      >
        <div className="flowchat-turn-sidebar__inner">
          <div className="flowchat-turn-sidebar__header">
            <div className="flowchat-turn-sidebar__heading">
              <span className="flowchat-turn-sidebar__heading-text">{listTitle}</span>
              <span className="flowchat-turn-sidebar__counter">
                {currentTurn}/{totalTurns}
              </span>
            </div>
          </div>
          <div className="flowchat-turn-sidebar__list" role="list">
            {turns.map(turn => (
              <button
                key={turn.turnId}
                type="button"
                role="listitem"
                className={`flowchat-turn-sidebar__item${
                  turn.turnIndex === currentTurn ? ' flowchat-turn-sidebar__item--active' : ''
                }${
                  searchMatchedTurnIds?.has(turn.turnId)
                    ? ' flowchat-turn-sidebar__item--search-match'
                    : ''
                }`}
                onClick={() => onSelectTurn(turn.turnId)}
                ref={turn.turnIndex === currentTurn ? activeTurnItemRef : undefined}
              >
                <span className="flowchat-turn-sidebar__badge">
                  {t('flowChatHeader.turnBadge', {
                    current: turn.turnIndex,
                    defaultValue: `Turn ${turn.turnIndex}`,
                  })}
                </span>
                <span className="flowchat-turn-sidebar__title">{turn.title}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    );
  },
);

FlowChatTurnListSidebar.displayName = 'FlowChatTurnListSidebar';
