/**
 * MediaRenderer 媒体类渲染器
 * @module @chips/foundation/renderer/base-card-renderers/renderers/media-renderer
 */

import type { BaseCardConfig } from '../../../core/types';
import {
  BaseCardRenderer,
  type BaseCardRenderResult,
  type RenderContext,
} from '../base-card-renderer';

/**
 * 图片内容
 */
export interface ImageContent {
  /** 图片URL */
  src: string;
  /** 替代文本 */
  alt?: string;
  /** 标题 */
  caption?: string;
}

/**
 * 视频内容
 */
export interface VideoContent {
  /** 视频URL */
  src: string;
  /** 海报图 */
  poster?: string;
  /** 是否自动播放 */
  autoplay?: boolean;
  /** 是否循环 */
  loop?: boolean;
}

/**
 * 音频内容
 */
export interface AudioContent {
  /** 音频URL */
  src: string;
  /** 标题 */
  title?: string;
  /** 艺术家 */
  artist?: string;
}

/**
 * 图片渲染器
 */
export class ImageRenderer extends BaseCardRenderer<ImageContent> {
  readonly type = 'image';
  readonly supportedTypes = ['image', 'picture', 'photo'];

  render(
    config: BaseCardConfig<ImageContent>,
    _context: RenderContext
  ): BaseCardRenderResult {
    const content = config.content;
    const alt = this.escapeHtml(content.alt ?? '');

    let html = `<img src="${this.escapeHtml(content.src)}" alt="${alt}" loading="lazy">`;

    if (content.caption) {
      html = `
        <figure>
          ${html}
          <figcaption>${this.escapeHtml(content.caption)}</figcaption>
        </figure>
      `;
    }

    return {
      html: this.wrapHtml(html, 'image-card'),
      css: this.getDefaultCSS(),
    };
  }

  override getDefaultCSS(): string {
    return `
      .image-card {
        text-align: center;
      }
      .image-card img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .image-card figure {
        margin: 0;
      }
      .image-card figcaption {
        margin-top: 8px;
        color: #666;
        font-size: 14px;
      }
    `;
  }
}

/**
 * 视频渲染器
 */
export class VideoRenderer extends BaseCardRenderer<VideoContent> {
  readonly type = 'video';
  readonly supportedTypes = ['video'];

  render(
    config: BaseCardConfig<VideoContent>,
    _context: RenderContext
  ): BaseCardRenderResult {
    const content = config.content;
    const attrs: string[] = ['controls'];

    if (content.autoplay) {
      attrs.push('autoplay');
    }
    if (content.loop) {
      attrs.push('loop');
    }
    if (content.poster) {
      attrs.push(`poster="${this.escapeHtml(content.poster)}"`);
    }

    const html = `
      <video ${attrs.join(' ')}>
        <source src="${this.escapeHtml(content.src)}">
        Your browser does not support the video tag.
      </video>
    `;

    return {
      html: this.wrapHtml(html, 'video-card'),
      css: this.getDefaultCSS(),
    };
  }

  override getDefaultCSS(): string {
    return `
      .video-card {
        background: #000;
      }
      .video-card video {
        width: 100%;
        display: block;
      }
    `;
  }
}

/**
 * 音频渲染器
 */
export class AudioRenderer extends BaseCardRenderer<AudioContent> {
  readonly type = 'audio';
  readonly supportedTypes = ['audio', 'music'];

  render(
    config: BaseCardConfig<AudioContent>,
    _context: RenderContext
  ): BaseCardRenderResult {
    const content = config.content;

    let info = '';
    if (content.title || content.artist) {
      info = `
        <div class="audio-info">
          ${content.title ? `<div class="audio-title">${this.escapeHtml(content.title)}</div>` : ''}
          ${content.artist ? `<div class="audio-artist">${this.escapeHtml(content.artist)}</div>` : ''}
        </div>
      `;
    }

    const html = `
      ${info}
      <audio controls>
        <source src="${this.escapeHtml(content.src)}">
        Your browser does not support the audio element.
      </audio>
    `;

    return {
      html: this.wrapHtml(html, 'audio-card'),
      css: this.getDefaultCSS(),
    };
  }

  override getDefaultCSS(): string {
    return `
      .audio-card {
        padding: 16px;
      }
      .audio-card audio {
        width: 100%;
      }
      .audio-card .audio-info {
        margin-bottom: 12px;
      }
      .audio-card .audio-title {
        font-weight: bold;
        font-size: 16px;
      }
      .audio-card .audio-artist {
        color: #666;
        font-size: 14px;
      }
    `;
  }
}

// 创建渲染器实例
export const imageRenderer = new ImageRenderer();
export const videoRenderer = new VideoRenderer();
export const audioRenderer = new AudioRenderer();
