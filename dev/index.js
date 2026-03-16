import * as logic from 'solid-logic'
import pane from '../src/sourcePane'
import './dev-global.css'
import * as $rdf from 'rdflib'
import * as UI from 'solid-ui'

const loginBanner = document.getElementById('loginBanner')
const webId = document.getElementById('webId')

loginBanner.appendChild(UI.login.loginStatusBox(document, null, {}))

async function finishLogin () {
  await logic.authSession.handleIncomingRedirect()
  const session = logic.authSession
  if (session.info.isLoggedIn) {
    // Update the page with the status.
    webId.innerHTML = 'Logged in as: ' + logic.authn.currentUser().uri
  } else {
    webId.innerHTML = ''
  }
}

finishLogin()

// https://testingsolidos.solidcommunity.net/profile/card#me
// https://timbl.solidcommunity.net/profile/card#me
//
// const targetURIToShow = "https://angelo.veltens.org/profile/card#me";
// const targetURIToShow = "https://testingsolidos.solidcommunity.net/profile/card#me";
// const targetURIToShow = "https://timbl.solidcommunity.net/profile/card#me";

// const targetURIToShow = "https://solidproject.solidcommunity.net/Roadmap/index.ttl#this";

// const targetURIToShow = "https://timbl.com/timbl/Automation/mother/tracker.n3#mother"
// const targetURIToShow = 'https://sstratsianis.solidcommunity.net/TestingTracker/index.ttl#this'
const targetURIToShow = 'https://testingsolidos.solidcommunity.net/profile/card#me'

const context = {
  dom: document,
  session: {
    store: logic.store
  },
  getOutliner: () => null
}

try {
  const app = pane.render($rdf.sym(targetURIToShow), context)
  document.getElementById('app').replaceWith(app)
} catch (err) {
  console.error('Error rendering pane:', err)
  document.getElementById('app').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`
}

