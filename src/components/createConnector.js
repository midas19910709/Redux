import createReduxShape from '../utils/createReduxShape';
import identity from '../utils/identity';
import shallowEqual from '../utils/shallowEqual';
import isPlainObject from '../utils/isPlainObject';
import invariant from 'invariant';

export default function createConnector(React) {
  const { Component, PropTypes } = React;

  return class Connector extends Component {
    static contextTypes = {
      redux: createReduxShape(PropTypes).isRequired
    };

    static propTypes = {
      children: PropTypes.func.isRequired,
      select: PropTypes.func.isRequired
    };

    static defaultProps = {
      select: identity
    };

    shouldComponentUpdate(nextProps, nextState) {
      return !this.isSliceEqual(this.state.slice, nextState.slice) ||
             !shallowEqual(this.props, nextProps);
    }

    isSliceEqual(slice, nextSlice) {
      const isRefEqual = slice === nextSlice;
      if (isRefEqual) {
        return true;
      } else if (typeof slice !== 'object' || typeof nextSlice !== 'object') {
        return isRefEqual;
      }
      return shallowEqual(slice, nextSlice);
    }

    constructor(props, context) {
      super(props, context);

      this.state = this.selectState(props, context);
    }

    componentDidMount() {
      this.unsubscribe = this.context.redux.subscribe(::this.handleChange);
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.select !== this.props.select) {
        // Force the state slice recalculation
        this.handleChange(nextProps);
      }
    }

    componentWillUnmount() {
      this.unsubscribe();
    }

    handleChange(props = this.props) {
      const nextState = this.selectState(props, this.context);
      this.setState(nextState);
    }

    selectState(props, context) {
      const state = context.redux.getState();
      const slice = props.select(state);

      invariant(
        isPlainObject(slice),
        'The return value of `select` prop must be an object. Instead received %s.',
        slice
      );

      return { slice };
    }

    render() {
      const { children } = this.props;
      const { slice } = this.state;
      const { redux: { dispatch } } = this.context;

      return children({ dispatch, ...slice });
    }
  };
}
