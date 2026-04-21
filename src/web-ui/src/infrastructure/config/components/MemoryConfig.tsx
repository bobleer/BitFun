import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigPageLoading, NumberInput, Switch } from '@/component-library';
import { notificationService } from '@/shared/notification-system';
import { createLogger } from '@/shared/utils/logger';
import { configManager } from '../services/ConfigManager';
import {
  ConfigPageContent,
  ConfigPageHeader,
  ConfigPageLayout,
  ConfigPageRow,
  ConfigPageSection,
} from './common';
import './AIFeaturesConfig.scss';

const log = createLogger('MemoryConfig');

const DEFAULT_EXTRACT_EVERY_ELIGIBLE_TURNS = 1;
const normalizeExtractEveryEligibleTurns = (value: number) =>
  Math.max(DEFAULT_EXTRACT_EVERY_ELIGIBLE_TURNS, value);

const MemoryConfig: React.FC = () => {
  const { t } = useTranslation('settings/memory');
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [extractEveryEligibleTurns, setExtractEveryEligibleTurns] = useState(
    DEFAULT_EXTRACT_EVERY_ELIGIBLE_TURNS
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const [loadedEnabled, loadedThreshold] = await Promise.all([
          configManager.getConfig<boolean>('ai.auto_memory.enabled'),
          configManager.getConfig<number>('ai.auto_memory.extract_every_eligible_turns'),
        ]);

        if (cancelled) {
          return;
        }

        setEnabled(loadedEnabled ?? true);
        setExtractEveryEligibleTurns(
          normalizeExtractEveryEligibleTurns(
            loadedThreshold ?? DEFAULT_EXTRACT_EVERY_ELIGIBLE_TURNS
          )
        );
      } catch (error) {
        log.error('Failed to load auto memory settings', error);
        if (!cancelled) {
          notificationService.error(t('messages.saveFailed'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const saveEnabled = async (nextValue: boolean) => {
    const previousValue = enabled;
    setEnabled(nextValue);
    setIsSaving(true);
    try {
      await configManager.setConfig('ai.auto_memory.enabled', nextValue);
      notificationService.success(t('messages.saveSuccess'), { duration: 2000 });
    } catch (error) {
      log.error('Failed to save ai.auto_memory.enabled', error);
      setEnabled(previousValue);
      notificationService.error(t('messages.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveThreshold = async (nextValue: number) => {
    const normalizedValue = normalizeExtractEveryEligibleTurns(nextValue);
    const previousValue = extractEveryEligibleTurns;

    if (normalizedValue === previousValue) {
      return;
    }

    setExtractEveryEligibleTurns(normalizedValue);
    setIsSaving(true);
    try {
      await configManager.setConfig(
        'ai.auto_memory.extract_every_eligible_turns',
        normalizedValue
      );
      notificationService.success(t('messages.saveSuccess'), { duration: 2000 });
    } catch (error) {
      log.error('Failed to save ai.auto_memory.extract_every_eligible_turns', error);
      setExtractEveryEligibleTurns(previousValue);
      notificationService.error(t('messages.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ConfigPageLayout className="bitfun-func-agent-config">
        <ConfigPageHeader title={t('title')} subtitle={t('subtitle')} />
        <ConfigPageContent className="bitfun-func-agent-config__content">
          <ConfigPageLoading text={t('loading.text')} />
        </ConfigPageContent>
      </ConfigPageLayout>
    );
  }

  return (
    <ConfigPageLayout className="bitfun-func-agent-config">
      <ConfigPageHeader title={t('title')} subtitle={t('subtitle')} />
      <ConfigPageContent className="bitfun-func-agent-config__content">
        <ConfigPageSection
          title={t('autoMemory.sectionTitle')}
          description={t('autoMemory.sectionDescription')}
        >
          <ConfigPageRow
            label={t('autoMemory.enabled')}
            description={t('autoMemory.enabledDesc')}
            align="center"
          >
            <div className="bitfun-func-agent-config__row-control">
              <Switch
                checked={enabled}
                onChange={(event) => void saveEnabled(event.target.checked)}
                disabled={isSaving}
                size="small"
              />
            </div>
          </ConfigPageRow>
          <ConfigPageRow
            label={t('autoMemory.extractEveryEligibleTurns')}
            description={t('autoMemory.extractEveryEligibleTurnsDesc')}
            align="center"
          >
            <div className="bitfun-func-agent-config__row-control">
              <NumberInput
                value={extractEveryEligibleTurns}
                onChange={(value) => void saveThreshold(value)}
                min={1}
                max={100}
                step={1}
                disabled={isSaving}
                size="small"
                variant="compact"
              />
            </div>
          </ConfigPageRow>
        </ConfigPageSection>
      </ConfigPageContent>
    </ConfigPageLayout>
  );
};

export default MemoryConfig;
