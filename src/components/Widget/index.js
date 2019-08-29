/* eslint-disable no-undef */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  toggleChat,
  openChat,
  showChat,
  addUserMessage,
  emitUserMessage,
  addResponseMessage,
  addLinkSnippet,
  addVideoSnippet,
  addImageSnippet,
  addQuickReply,
  renderCustomComponent,
  initialize,
  connectServer,
  disconnectServer,
  pullSession
} from 'actions';

import { isSnippet, isVideo, isImage, isQR, isText } from './msgProcessor';
import WidgetLayout from './layout';
import { storeLocalSession, getLocalSession } from '../../store/reducers/helper';
import { SESSION_NAME, NEXT_MESSAGE } from 'constants';

class Widget extends Component {

  constructor(props) {
    super(props);
    this.messages = [];
    setInterval(() => {
      if (this.messages.length > 0) {
        let msg_date = new Date();
        let from_data = {
          use_from_who: this.props.use_from_who,
          name: this.props.bot_name,
          msg_date: msg_date,
          from_user_msg_footer: this.props.from_user_msg_footer,
          from_bot_msg_footer: this.props.from_bot_msg_footer
        };
        this.dispatchMessage(this.messages.shift(), from_data);
      }
    }, this.props.interval);
  }

  componentDidMount() {
    const { socket, storage } = this.props;

    socket.on('bot_uttered', (botUttered) => {
      this.messages.push(botUttered);
    });

    this.props.dispatch(pullSession(this.get_functions()));

    // Request a session from server
    const local_id = this.getSessionId();
    socket.on('connect', () => {
      socket.emit('session_request', ({ 'session_id': local_id }));
    });

    // When session_confirm is received from the server:
    socket.on('session_confirm', (remote_id) => {
      console.log(`session_confirm:${socket.id} session_id:${remote_id}`);

      // Store the initial state to both the redux store and the storage, set connected to true
      this.props.dispatch(connectServer());

      /*
      Check if the session_id is consistent with the server
      If the local_id is null or different from the remote_id,
      start a new session.
      */
      if (local_id !== remote_id) {

        // storage.clear();
        // Store the received session_id to storage

        storeLocalSession(storage, SESSION_NAME, remote_id);
        this.props.dispatch(pullSession(this.get_functions()));
        this.trySendInitPayload()
      } else {
        // If this is an existing session, it's possible we changed pages and want to send a
        // user message when we land.
        const nextMessage = window.localStorage.getItem(NEXT_MESSAGE);

        if (nextMessage !== null) {
          const { message, expiry } = JSON.parse(nextMessage);
          window.localStorage.removeItem(NEXT_MESSAGE);

          if (expiry === 0 || expiry > Date.now()) {
            this.props.dispatch(addUserMessage(message));
            this.props.dispatch(emitUserMessage(message));
          }
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(reason);
      if (reason !== 'io client disconnect') {
        this.props.dispatch(disconnectServer());
      }
    });

    if (this.props.embedded && this.props.initialized) {
      this.props.dispatch(showChat());
      this.props.dispatch(openChat());
    }
  }

  componentDidUpdate() {
    this.props.dispatch(pullSession(this.get_functions()));
    this.trySendInitPayload();
    if (this.props.embedded && this.props.initialized) {
      this.props.dispatch(showChat());
      this.props.dispatch(openChat());
    }
  }

  componentWillUnmount() {
    const { socket } = this.props;
    socket.close();
  }

  get_functions() {
    const { from_bot_msg_footer, from_user_msg_footer, customComponent } = this.props;
    return {
      from_bot_msg_footer,
      from_user_msg_footer,
      customComponent
    };
  }

  getSessionId() {
    const { storage } = this.props;
    // Get the local session, check if there is an existing session_id
    const localSession = getLocalSession(storage, SESSION_NAME);
    const local_id = localSession? localSession.session_id: null;
    return local_id;
  }

  // TODO: Need to erase redux store on load if localStorage
  // is erased. Then behavior on reload can be consistent with
  // behavior on first load

  trySendInitPayload = () => {
    const {
      initPayload,
      customData,
      socket,
      initialized,
      isChatOpen,
      isChatVisible,
      embedded,
      connected
    } = this.props;

    // Send initial payload when chat is opened or widget is shown
    if (!initialized && connected && (((isChatOpen && isChatVisible) || embedded))) {
      // Only send initial payload if the widget is connected to the server but not yet initialized

      const session_id = this.getSessionId();

      // check that session_id is confirmed
      if (!session_id) return
      console.log("sending init payload", session_id)
      socket.emit('user_uttered', { message: initPayload, customData, session_id: session_id });
      this.props.dispatch(initialize());
    }
  }

  toggleConversation = () => {
    this.props.dispatch(toggleChat());
  };

  dispatchMessage(message, from_data) {
    if (Object.keys(message).length === 0) {
      return;
    }

    if (isText(message)) {
      this.props.dispatch(addResponseMessage(message.text, from_data));
    } else if (isQR(message)) {
      from_data.user_name = this.props.user_name;
      this.props.dispatch(addQuickReply(message, from_data));
    } else if (isSnippet(message)) {
      const element = message.attachment.payload.elements[0];
      this.props.dispatch(addLinkSnippet({
        title: element.title,
        content: element.buttons[0].title,
        link: element.buttons[0].url,
        target: '_blank'
      }));
    } else if (isVideo(message)) {
      const element = message.attachment.payload;
      this.props.dispatch(addVideoSnippet({
        title: element.title,
        video: element.src
      }));
    } else if (isImage(message)) {
      const element = message.attachment.payload;
      this.props.dispatch(addImageSnippet({
        title: element.title,
        image: element.src
      }));
    } else {
      // some custom message
      const props = message;
      if (this.props.customComponent) {
        this.props.dispatch(renderCustomComponent(this.props.customComponent, props, true));
      }
    }
  }

  handleMessageSubmit = (event) => {
    event.preventDefault();
    const userUttered = event.target.message.value;
    if (userUttered) {
      let msg_date = new Date();
      let from_data = {
        use_from_who: this.props.use_from_who,
        name: this.props.user_name,
        msg_date: msg_date
      };
      this.props.dispatch(addUserMessage(userUttered, from_data));
      this.props.dispatch(emitUserMessage(userUttered));
    }
    event.target.message.value = '';
  };

  render() {
    return (
      <WidgetLayout
        toggleChat={this.toggleConversation}
        onSendMessage={this.handleMessageSubmit}
        title={this.props.title}
        subtitle={this.props.subtitle}
        customData={this.props.customData}
        profileAvatar={this.props.profileAvatar}
        showCloseButton={this.props.showCloseButton}
        hideWhenNotConnected={this.props.hideWhenNotConnected}
        fullScreenMode={this.props.fullScreenMode}
        isChatOpen={this.props.isChatOpen}
        isChatVisible={this.props.isChatVisible}
        badge={this.props.badge}
        embedded={this.props.embedded}
        params={this.props.params}
        openLauncherImage={this.props.openLauncherImage}
        closeImage={this.props.closeImage}
        customComponent={this.props.customComponent}
      />
    );
  }
}

const mapStateToProps = state => ({
  initialized: state.behavior.get('initialized'),
  connected: state.behavior.get('connected'),
  isChatOpen: state.behavior.get('isChatOpen'),
  isChatVisible: state.behavior.get('isChatVisible')
});

Widget.propTypes = {
  interval: PropTypes.number,
  title: PropTypes.string,
  customData: PropTypes.shape({}),
  subtitle: PropTypes.string,
  initPayload: PropTypes.string,
  profileAvatar: PropTypes.string,
  showCloseButton: PropTypes.bool,
  hideWhenNotConnected: PropTypes.bool,
  fullScreenMode: PropTypes.bool,
  isChatVisible: PropTypes.bool,
  isChatOpen: PropTypes.bool,
  badge: PropTypes.number,
  socket: PropTypes.shape({}),
  embedded: PropTypes.bool,
  params: PropTypes.object,
  connected: PropTypes.bool,
  initialized: PropTypes.bool,
  openLauncherImage: PropTypes.string,
  closeImage: PropTypes.string,
  customComponent: PropTypes.func,
  use_from_who: PropTypes.bool,
  user_name: PropTypes.string,
  bot_name: PropTypes.string,
  from_user_msg_footer: PropTypes.func,
  from_bot_msg_footer: PropTypes.func
};

Widget.defaultProps = {
  isChatOpen: false,
  isChatVisible: true,
};

export default connect(mapStateToProps)(Widget);
