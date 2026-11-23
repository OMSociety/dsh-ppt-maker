import { describe, expect, it } from 'vitest'
import { opLabel, opsSummaryOf } from '../client/render/op-label'

describe('版本历史 · 编辑说明', () => {
  it('各类操作记录对应的说明', () => {
    expect(opLabel('create')).toBe('创建工程')
    expect(opLabel('update_element pages/02.page#chart')).toBe('修改元素 · 第 2 页 · chart')
    expect(opLabel('add_element pages/01.page#title')).toBe('新增元素 · 第 1 页 · title')
    expect(opLabel('remove_element pages/03.page#logo')).toBe('删除元素 · 第 3 页 · logo')
    expect(opLabel('add_page pages/04.page@3')).toBe('新增页面 · 第 4 页（位置 4）')
    expect(opLabel('remove_page pages/02.page')).toBe('删除页面 · 第 2 页')
    expect(opLabel('update_page pages/01.page')).toBe('修改页面 · 第 1 页')
    expect(opLabel('move_page pages/01.page 0→2')).toBe('调整页序 · 第 1 页：1 → 3')
    expect(opLabel('page_duplicate pages/01.page→pages/02.page')).toBe('复制页面 · 第 1 页 → 第 2 页')
    expect(opLabel('update_svg_source pages/03.page→media/svg/03-visual.svg')).toBe(
      '更新 SVG 源 · 第 3 页 · media/svg/03-visual.svg'
    )
  })

  it('未知记录按原文显示', () => {
    expect(opLabel('future_op pages/01.page')).toBe('future_op pages/01.page')
  })

  it('摘要合并同类项并标注次数，最多列三类', () => {
    const ops = [
      'update_element pages/02.page#chart',
      'update_element pages/02.page#chart',
      'update_element pages/02.page#table'
    ]
    expect(opsSummaryOf(ops, 0)).toBe('修改元素 · 第 2 页 · chart ×2；修改元素 · 第 2 页 · table')
    expect(opsSummaryOf([], 0)).toBe('创建工程')
    expect(opsSummaryOf(['create'], 2)).toBe('创建工程（合并 2 次编辑）')
    const many = ['a', 'b', 'c', 'd', 'e'].map((id) => `add_element pages/01.page#${id}`)
    expect(opsSummaryOf(many, 0)).toContain('；另有 2 类')
  })
})
