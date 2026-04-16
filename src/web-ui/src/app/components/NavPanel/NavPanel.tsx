/**
 * NavPanel — navigation sidebar container.
 *
 * Renders the scene-specific nav layer when registered in nav-registry
 * (e.g. file-viewer). Session list and primary nav actions live
 * elsewhere (SessionCapsule, PersistentFooterActions).
 */

import React, { Suspense, useState, useEffect } from 'react';
import { useI18n } from '@/infrastructure/i18n';
import { useNavSceneStore } from '../../stores/navSceneStore';
import { getSceneNav } from '../../scenes/nav-registry';
import type { OverlaySceneId } from '../../overlay/types';
import './NavPanel.scss';

interface NavPanelProps {
  className?: string;
}

const NavPanel: React.FC<NavPanelProps> = ({ className = '' }) => {
  const { t } = useI18n('common');
  const showSceneNav = useNavSceneStore(s => s.showSceneNav);
  const navSceneId = useNavSceneStore(s => s.navSceneId);

  const [mountedSceneId, setMountedSceneId] = useState<OverlaySceneId | null>(navSceneId);
  useEffect(() => {
    if (navSceneId) setMountedSceneId(navSceneId);
  }, [navSceneId]);

  const SceneNavComponent = mountedSceneId ? getSceneNav(mountedSceneId) : null;

  const contentCls = [
    'bitfun-nav-panel__content',
    showSceneNav && 'is-scene',
  ].filter(Boolean).join(' ');

  const sceneCls = [
    'bitfun-nav-panel__layer bitfun-nav-panel__layer--scene',
    showSceneNav && 'is-active',
  ].filter(Boolean).join(' ');

  return (
    <nav className={`bitfun-nav-panel ${className}`} aria-label={t('nav.aria.mainNav')}>
      <div className={contentCls}>
        {SceneNavComponent && (
          <div className={sceneCls}>
            <Suspense fallback={null}>
              <div key={mountedSceneId} className="bitfun-nav-panel__scene-inner">
                <SceneNavComponent />
              </div>
            </Suspense>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavPanel;
