import React, { PureComponent } from 'react';
import ReactMarkdown from 'react-markdown';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { PROP_TYPES } from 'constants';
import DocViewer from '../docViewer';
import './styles.scss';

class Message extends PureComponent {
  render() {
    const { docViewer } = this.props;
    const sender = this.props.message.get('sender');
    const text = this.props.message.get('text');
    const from_data = this.props.message.get('from_data');
    const css_message_from = sender === "response" ? "message-from-bot" : "message-from-user";
    const css_message = sender === "response" ? "message-bot-container" : "message-user-container";
    return (
      <div className={css_message}>
        <div className={sender}>
          <div className={"message-text " + css_message_from}>
            {sender === 'response' ? (
              <ReactMarkdown
                className={'markdown'}
                source={text}
                linkTarget={(url) => {
                  if (!url.startsWith('mailto') && !url.startsWith('javascript')) return '_blank';
                  return undefined;
                }}
                transformLinkUri={null}
                renderers={{
                  link: props =>
                    docViewer ? (
                      <DocViewer src={props.href}>{props.children}</DocViewer>
                    ) : (
                      <a href={props.href}>{props.children}</a>
                    )
                }}
              />
            ) : (
              text
            )}
          </div>
        </div>
        { from_data && from_data.use_from_who &&
          <div  className={"message-from " + css_message_from}>
            {sender === "response" ? (
              from_data.from_bot_msg_footer ? from_data.from_bot_msg_footer(from_data.msg_date) : from_data.name
            ) : (
              from_data.from_user_msg_footer ? from_data.from_user_msg_footer(from_data.msg_date) : from_data.name
            )}
          </div>
        }
      </div>
    );
  }
}

Message.propTypes = {
  message: PROP_TYPES.MESSAGE,
  docViewer: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
  docViewer: state.behavior.get('docViewer')
});

export default connect(mapStateToProps)(Message);
