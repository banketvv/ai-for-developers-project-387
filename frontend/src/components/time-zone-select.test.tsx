import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TimeZoneSelect } from '@/components/time-zone-select'
import { TIME_ZONE_COOKIE, TimeZoneProvider } from '@/lib/timezone'

function renderSelect(): HTMLSelectElement {
  render(
    <TimeZoneProvider>
      <TimeZoneSelect />
    </TimeZoneProvider>,
  )
  return screen.getByLabelText('Часовой пояс') as HTMLSelectElement
}

describe('TimeZoneSelect', () => {
  it('подписывает автоматически определённый пояс', () => {
    const select = renderSelect()

    expect(select).toHaveValue('auto')
    expect(select.selectedOptions[0]).toHaveTextContent(
      'Москва (+0, определено автоматически)',
    )
  })

  it('показывает выбранный вручную пояс и запоминает его', async () => {
    const user = userEvent.setup()
    const select = renderSelect()

    await user.selectOptions(select, 'Asia/Yekaterinburg')

    expect(select).toHaveValue('Asia/Yekaterinburg')
    expect(select.selectedOptions[0]).toHaveTextContent('Екатеринбург (+2)')
    expect(document.cookie).toContain(
      `${TIME_ZONE_COOKIE}=${encodeURIComponent('Asia/Yekaterinburg')}`,
    )
  })
})
