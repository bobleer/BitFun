/**
 * Design Canvas Inspector drawer.
 *
 * Three tabs on a compact right-side drawer inside DesignCanvasPanel:
 * 1. Element — DOM path + computed-style map from the preview iframe.
 * 2. Tokens — CSS custom properties captured from `:root` inside the iframe.
 * 3. Assets — artifact files grouped by kind; clicking opens the file in the Code view.
 */

import React, { useMemo, useState } from 'react';
import { ClipboardCopy, FileText, Layers, Palette } from 'lucide-react';
import type { DesignArtifactManifest, SelectedElement } from './store/designArtifactStore';
import './DesignInspector.scss';

type InspectorTab = 'element' | 'tokens' | 'assets';

export interface DesignInspectorProps {
  manifest: DesignArtifactManifest;
  selectedElement?: SelectedElement;
  tokens?: Record<string, string>;
  onOpenFile: (path: string) => void;
  onCopyContext: () => void;
}

const ASSET_KIND_LABELS: Record<string, string> = {
  html: '页面',
  css: '样式',
  js: '脚本',
  mjs: '脚本',
  json: '数据',
  png: '图片',
  jpg: '图片',
  jpeg: '图片',
  webp: '图片',
  svg: '图片',
  ttf: '字体',
  woff: '字体',
  woff2: '字体',
};

function groupFiles(manifest: DesignArtifactManifest) {
    const groups: Record<string, string[]> = {};
  for (const file of manifest.files) {
    const ext = (file.path.split('.').pop() || 'other').toLowerCase();
    const label = ASSET_KIND_LABELS[ext] ?? '其他';
    if (!groups[label]) groups[label] = [];
    groups[label].push(file.path);
  }
  return groups;
}

export const DesignInspector: React.FC<DesignInspectorProps> = ({
  manifest,
  selectedElement,
  tokens,
  onOpenFile,
  onCopyContext,
}) => {
  const [tab, setTab] = useState<InspectorTab>('element');

  const grouped = useMemo(() => groupFiles(manifest), [manifest]);
  const tokenEntries = useMemo(() => {
    const source = tokens ?? {};
    return Object.keys(source)
      .sort()
      .map((name) => [name, source[name]] as const);
  }, [tokens]);

  return (
    <aside className="design-inspector">
      <div className="design-inspector__tabs">
        <button
          type="button"
          className={`design-inspector__tab${tab === 'element' ? ' design-inspector__tab--active' : ''}`}
          onClick={() => setTab('element')}
        >
          <Layers size={13} />
          元素
        </button>
        <button
          type="button"
          className={`design-inspector__tab${tab === 'tokens' ? ' design-inspector__tab--active' : ''}`}
          onClick={() => setTab('tokens')}
        >
          <Palette size={13} />
          令牌
        </button>
        <button
          type="button"
          className={`design-inspector__tab${tab === 'assets' ? ' design-inspector__tab--active' : ''}`}
          onClick={() => setTab('assets')}
        >
          <FileText size={13} />
          资源
        </button>
      </div>

      <div className="design-inspector__body">
        {tab === 'element' && (
          <div className="design-inspector__section">
            {!selectedElement?.domPath ? (
              <div className="design-inspector__empty">
                在工具栏启用取样器，然后点击预览中的任意元素以查看其计算样式。
              </div>
            ) : (
              <>
                <div className="design-inspector__row">
                  <span className="design-inspector__label">路径</span>
                  <code className="design-inspector__value">{selectedElement.domPath}</code>
                </div>
                {selectedElement.textExcerpt && (
                  <div className="design-inspector__row">
                    <span className="design-inspector__label">文字</span>
                    <span className="design-inspector__value">
                      “{selectedElement.textExcerpt}”
                    </span>
                  </div>
                )}
                {selectedElement.rect && (
                  <div className="design-inspector__row">
                    <span className="design-inspector__label">盒子</span>
                    <code className="design-inspector__value">
                      {`${Math.round(selectedElement.rect.width)}×${Math.round(
                        selectedElement.rect.height
                      )} @ (${Math.round(selectedElement.rect.x)}, ${Math.round(
                        selectedElement.rect.y
                      )})`}
                    </code>
                  </div>
                )}
                <div className="design-inspector__subhead">计算样式</div>
                <div className="design-inspector__styles">
                  {selectedElement.computedStyle &&
                  Object.keys(selectedElement.computedStyle).length > 0 ? (
                    Object.entries(selectedElement.computedStyle).map(([name, value]) => (
                      <div key={name} className="design-inspector__style">
                        <code className="design-inspector__style-name">{name}</code>
                        <span className="design-inspector__style-value">{value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="design-inspector__empty">暂无样式数据</div>
                  )}
                </div>
                <button
                  type="button"
                  className="design-inspector__copy-btn"
                  onClick={onCopyContext}
                >
                  <ClipboardCopy size={12} />
                  复制选中上下文
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'tokens' && (
          <div className="design-inspector__section">
            <div className="design-inspector__subhead">设计令牌</div>
            {tokenEntries.length === 0 ? (
              <div className="design-inspector__empty">
                未在文档根节点发现 CSS 自定义属性。
              </div>
            ) : (
              <div className="design-inspector__tokens">
                {tokenEntries.map(([name, value]) => (
                  <div key={name} className="design-inspector__token">
                    <span
                      className="design-inspector__token-swatch"
                      style={{
                        background:
                          /^#|^rgb|^hsl|^oklch/.test(value) || /color/i.test(name)
                            ? value
                            : 'transparent',
                      }}
                    />
                    <code className="design-inspector__token-name">{name}</code>
                    <span className="design-inspector__token-value">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'assets' && (
          <div className="design-inspector__section">
            {Object.entries(grouped).map(([groupLabel, files]) => (
              <div key={groupLabel} className="design-inspector__asset-group">
                <div className="design-inspector__subhead">{groupLabel}</div>
                <ul className="design-inspector__asset-list">
                  {files.map((path) => (
                    <li key={path}>
                      <button
                        type="button"
                        className="design-inspector__asset-item"
                        onClick={() => onOpenFile(path)}
                        title={path}
                      >
                        {path}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesignInspector;
