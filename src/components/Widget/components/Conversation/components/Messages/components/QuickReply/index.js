import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { PROP_TYPES } from 'constants';
import { addUserMessage, emitUserMessage, setQuickReply, toggleInputDisabled, changeInputFieldHint } from 'actions';
import Message from '../Message/index';

import './styles.scss';

class QuickReply extends PureComponent {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);

    const hint = this.props.message.get('hint');
    const chosenReply = this.props.getChosenReply(this.props.id);
    if (!chosenReply && !this.props.inputState) {
      // this.props.toggleInputDisabled();
      // this.props.changeInputFieldHint(hint);
    }
  }

  handleClick(reply) {
    const payload = reply.payload;
    const title = reply.title;
    const id = this.props.id;
    let from_data = {
      use_from_who: this.props.message.get('from_data').use_from_who,
      name: this.props.message.get('from_data').user_name,
      msg_date: new Date()
    };
    this.props.chooseReply(payload, title, id, from_data);
    // this.props.changeInputFieldHint('Type a message...');
  }

  render() {
    const chosenReply = this.props.getChosenReply(this.props.id);
    const hide_buttons = this.props.message.get('hide_buttons');
    if (chosenReply && hide_buttons) {
      return <Message message={this.props.message} />
    }
    return (
      <div>
        <Message message={this.props.message} />
        {/*{this.props.isLast &&*/}
        <div className="replies">
          {this.props.message.get('quick_replies').map((reply, index) => <div
            key={index} className={'reply'}
            onClick={this.handleClick.bind(this, reply)}
          >{reply.title}</div>)}
        </div>
        {/*}*/}
      </div>);
  }
}


const mapStateToProps = state => ({
  getChosenReply: id => state.messages.get(id).get('chosenReply'),
  inputState: state.behavior.get('disabledInput')
});

const mapDispatchToProps = dispatch => ({
  toggleInputDisabled: _ => dispatch(toggleInputDisabled()),
  changeInputFieldHint: hint => dispatch(changeInputFieldHint(hint)),
  chooseReply: (payload, title, id, from_data) => {
    dispatch(setQuickReply(id, title));
    dispatch(addUserMessage(title, from_data));
    dispatch(emitUserMessage(payload));
    // dispatch(toggleInputDisabled());
  }
});

QuickReply.propTypes = {
  message: PROP_TYPES.QUICK_REPLY
};

export default connect(mapStateToProps, mapDispatchToProps)(QuickReply);
