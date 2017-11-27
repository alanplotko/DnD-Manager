import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { Container, Tab, Tabs, TabHeading, Text, Icon, Button, Fab }
  from 'native-base';

import ContainerStyle from 'DNDManager/stylesheets/ContainerStyle';
import ActivityCard from 'DNDManager/components/ActivityCard';
import store from 'react-native-simple-store';

const ACTIVITY_KEY = '@DNDManager:activity';
const CAMPAIGN_KEY = '@DNDManager:campaign';
const CHARACTER_KEY = '@DNDManager:character';

export default class HomeScreen extends React.Component {
  static navigationOptions = {
    title: 'D&D Manager',
  }

  static propTypes = {
    navigation: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isRefreshing: false,
      fabActive: false,
    };
  }

  componentDidMount() {
    this.getData();
  }

  getData = () => {
    store.get([ACTIVITY_KEY, CAMPAIGN_KEY, CHARACTER_KEY]).then((data) => {
      this.setState({
        activity: data[0] || [{
          key: 'defaultCard',
          header: 'First time here?',
          body: 'Your activity feed will populate here over time. To get started, create a character or campaign!',
        }],
        campaigns: data[1] || [{
          key: 'defaultCard',
          header: 'No campaigns found!',
          body: 'Let\'s get started!',
        }],
        characters: data[2] || [{
          key: 'defaultCard',
          header: 'No campaigns found!',
          body: 'Let\'s get started!',
        }],
      });
    }).catch((error) => {
      console.error(`Store error (fetch profile): ${error.message}`);
    }).then(() => {
      this.setState({ isLoading: false, isRefreshing: false });
    });
  };

  handleRefresh = () => {
    this.setState({ isRefreshing: true });
    this.getData();
  };

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return (
        <Container style={ContainerStyle.parentContainer}>
          <ActivityIndicator color="#3F51B5" size="large" />
        </Container>
      );
    }

    return (
      <Container style={ContainerStyle.parentContainer}>
        <Tabs initialPage={0} locked>
          <Tab
            heading={<TabHeading><Icon name="home" /></TabHeading>}
            style={[styles.tab, ContainerStyle.paddedContainer]}
          >
            <FlatList
              data={this.state.activity}
              renderItem={({ item }) => (
                <ActivityCard header={item.header} body={item.body} />
              )}
              refreshing={this.state.isRefreshing}
              onRefresh={this.handleRefresh}
            />
          </Tab>
          <Tab
            heading={<TabHeading><Text>Campaigns</Text></TabHeading>}
            style={[styles.tab, ContainerStyle.paddedContainer]}
          >
            <FlatList
              data={this.state.campaigns}
              renderItem={({ item }) => (
                <ActivityCard header={item.header} body={item.body} />
              )}
              refreshing={this.state.isRefreshing}
              onRefresh={this.handleRefresh}
            />
          </Tab>
          <Tab
            heading={<TabHeading><Text>Characters</Text></TabHeading>}
            style={[styles.tab, ContainerStyle.paddedContainer]}
          >
            <FlatList
              data={this.state.characters}
              renderItem={({ item }) => (
                <ActivityCard header={item.header} body={item.body} />
              )}
              refreshing={this.state.isRefreshing}
              onRefresh={this.handleRefresh}
            />
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
            onPress={() => navigate('CreateCharacter')}
          >
            <Icon name="person" />
          </Button>
          <Button
            style={{ backgroundColor: '#999' }}
            onPress={() => navigate('CreateCampaign')}
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
    backgroundColor: '#3F51B5',
  },
  tab: {
    backgroundColor: '#eee',
  },
});
