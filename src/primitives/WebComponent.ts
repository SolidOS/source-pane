import { html, LitElement } from 'lit'
// copied from solid-ui for now so I can follow same structure as other webcomponets
// i think we need to export this, but want to talk to team
export default abstract class WebComponent extends LitElement {
  static states?: Record<string, Function>

  protected internals?: ElementInternals

  protected willUpdate (changedProperties: Map<string, any>) {
    super.willUpdate(changedProperties)

    const states = this.static().states

    if (!states) {
      return
    }

    const internals = this.getInternals()

    for (const [state, condition] of Object.entries(states)) {
      const matches = condition(this)

      if (matches && !internals.states.has(state)) {
        internals.states.add(state)
      } else if (!matches && internals.states.has(state)) {
        internals.states.delete(state)
      }
    }
  }

  protected render () {
    return html`<slot></slot>`
  }

  protected getInternals (): ElementInternals {
    this.internals ??= this.attachInternals()

    return this.internals
  }

  private static (): typeof WebComponent {
    return this.constructor as typeof WebComponent
  }
}
