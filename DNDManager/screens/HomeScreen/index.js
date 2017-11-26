import React, { Component } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Container, Content, Tab, Tabs, TabHeading, Text, Icon, Button, Fab }
  from 'native-base';
import ContainerStyle from 'DNDManager/stylesheets/ContainerStyle';

import Loader from 'DNDManager/components/Loader';
import ActivityCard from 'DNDManager/components/ActivityCard';
import store from 'react-native-simple-store';

const ACTIVITY_KEY = '@DNDManager:activity';
const CAMPAIGN_KEY = '@DNDManager:campaign';
const CHARACTER_KEY = '@DNDManager:character';

export default class HomeScreen extends Component {
  static navigationOptions = {
    title: 'D&D Manager'
  }

  componentDidMount() {
    store.get([ACTIVITY_KEY, CAMPAIGN_KEY, CHARACTER_KEY]).then((data) => {
      this.setState({
        activity: data[0],
        campaigns: data[1],
        characters: data[2]
      });
    }).catch(error => {
      console.error('Store error (fetch profile): ' + error.message);
    }).then(() => {
      this.setState({isLoading: false});
    })
  }

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      fabActive: false
    };
  }

  render() {
    store.save([ACTIVITY_KEY, CAMPAIGN_KEY, CHARACTER_KEY], [{}, {}, {}]);
    if (this.state.isLoading) {
      return (
        <Container style={ContainerStyle.parentContainer}>
          <Loader />
        </Container>
      );
    }
    return (
      <Container style={ContainerStyle.parentContainer}>
        <Tabs initialPage={0}>
          <Tab
            heading={<TabHeading><Icon name="home" /></TabHeading>}
            style={[styles.tab, ContainerStyle.paddedContainer]}
          >
            <Container>
              <Content>
                {
                  !this.state.activity &&
                  <ActivityCard
                    header="First time here?"
                    body="Your activity feed will populate here over time.
                          To get started, create a character or campaign!"
                  />
                }
              </Content>
            </Container>
          </Tab>
          <Tab
            heading={<TabHeading><Text>Campaigns</Text></TabHeading>}
            style={[styles.tab, ContainerStyle.paddedContainer]}
          >
            <Container>
              <Content>
                {
                  !this.state.campaigns &&
                  <ActivityCard
                    header="No Campaigns Found"
                    body="Let's get started!"
                  />
                }
              </Content>
            </Container>
          </Tab>
          <Tab
            heading={<TabHeading><Text>Characters</Text></TabHeading>}
            style={[styles.tab, ContainerStyle.paddedContainer]}
          >
            <Container>
              <Content>
                {
                  !this.state.characters &&
                  <ActivityCard
                    header="No Characters Found"
                    body="Let's get started!"
                  />
                }
              </Content>
            </Container>
          </Tab>
        </Tabs>
        <Fab
          active={this.state.fabActive}
          direction="up"
          style={styles.fab}
          position="bottomRight"
          onPress={() => this.setState({ fabActive: !this.state.fabActive })}
        >
          <Icon name="add" />
          <Button
            style={{ backgroundColor: '#999' }}
            onPress={() => this.props.navigation.navigate('CreateCharacter')}
          >
            <Icon name="person" />
          </Button>
          <Button
            style={{ backgroundColor: '#999' }}
            onPress={() => this.props.navigation.navigate('CreateCampaign')}
          >
            <Icon name="book" />
          </Button>
        </Fab>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#3F51B5'
  },
  tab: {
    backgroundColor: '#eee'
  }
});
