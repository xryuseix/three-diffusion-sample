import React, { createRef } from "react";
import Stage from "./Stage";
import Particle from "./Particle";

type Props = {
  period: number;
};

export class ThreeDiffusion extends React.Component<Props> {
  state: {
    step: number;
    ref: React.RefObject<HTMLDivElement>;
    period: number;
    stage: Stage | undefined;
    particle: Particle | undefined;
  };
  constructor(props: Props) {
    super(props);
    this.state = {
      step: 0,
      ref: createRef(),
      period: props.period,
      stage: undefined,
      particle: undefined,
    };
  }
  progress = () => {
    return this.state.particle?.progress();
  };
  regress = () => {
    return this.state.particle?.regress();
  };
  reset = () => {
    if (!this.state.stage) return;
    return this.setState({
      particle: new Particle({
        stage: this.state.stage,
        period: this.state.period,
      }),
    });
  };
  componentDidMount() {
    this.setState({
      stage: new Stage({ wrapper: this.state.ref }),
    });
  }
  componentDidUpdate(_prevProps: Props, prevState: typeof this.state) {
    if (prevState.stage !== this.state.stage) {
      if (this.state.stage && !this.state.particle) {
        this.setState({
          particle: new Particle({
            stage: this.state.stage,
            period: this.state.period,
          }),
        });
      }
    }
  }

  private _raf = () => {
    window.requestAnimationFrame(() => {
      this._raf();

      this.state.stage?.onRaf();
      this.state.particle?.onRaf();
    });
  };

  render() {
    this._raf();
    window.addEventListener("resize", () => {
      this.state.particle?.onResize();
    });
    return <div id="WebGL" ref={this.state.ref} />;
  }
}
