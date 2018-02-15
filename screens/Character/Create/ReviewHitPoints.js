import React from 'react';
import PropTypes from 'prop-types';
import { Keyboard, StyleSheet, View, Text } from 'react-native';
import { Container, Content } from 'native-base';
import { Button, Card, COLOR, Toolbar } from 'react-native-material-ui';
import Note from 'FifthEditionManager/components/Note';
import { CLASSES } from 'FifthEditionManager/config/Info';
import { validateInteger } from 'FifthEditionManager/util';
import { cloneDeep } from 'lodash';
import { CardStyle, ContainerStyle, FormStyle } from 'FifthEditionManager/stylesheets';

const t = require('tcomb-form-native');
const Chance = require('chance');

const chance = new Chance();

/**
 * Define hit points
 */

const HitPoints = t.struct({
  timesAverageTaken: t.Number,
});

/**
 * Form template setup
 */

const template = locals => (
  <View>
    {locals.inputs.timesAverageTaken}
  </View>
);

/**
 * Define form options
 */

const options = {
  template,
  fields: {
    timesAverageTaken: {
      label: 'Times Average Taken',
    },
  },
};

export default class ReviewHitPoints extends React.Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      const props = {
        leftElement: 'arrow-back',
        onLeftElementPress: () => navigation.goBack(),
        centerElement: 'Review Hit Points',
      };
      return <Toolbar {...props} />;
    },
  }

  static propTypes = {
    navigation: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      timesAverageTaken: null,
      hitPoints: null,
      rolls: null,
      rollCount: 0,
      isNoteCollapsed: false,
      type: HitPoints,
      form: null,
      options,
      ...props.navigation.state.params,
    };
    this.state.baseClass = CLASSES
      .find(option => option.key === this.state.character.profile.baseClass.lookupKey);
  }

  componentWillMount() {
    const { level } = this.state.character.profile;
    const { hitDie } = this.state.baseClass;

    // Form options setup after considering level
    const updatedOptions = t.update(this.state.options, {
      fields: {
        timesAverageTaken: {
          help: { $set: `Range [0, ${level - 1}]` },
          placeholder: {
            $set: `Take ${(hitDie / 2) + 1} hit points, ${level - 1} ${level - 1 !== 1 ? 'times' : 'time'} max`,
          },
        },
      },
    });

    // Form validation setup after considering level
    const TimesAverageTaken = t
      .refinement(t.Number, n => n % 1 === 0 && n >= 0 && n <= level - 1);
    TimesAverageTaken.getValidationErrorMessage = value => validateInteger(
      value,
      `Must be in range [0, ${level - 1}]`,
    );
    const HitPointsEdited = t.struct({ timesAverageTaken: TimesAverageTaken });
    this.setState({ options: updatedOptions, type: HitPointsEdited });
  }

  onChange = (value) => {
    this.setState({ form: value });
  }

  onPress = () => {
    Keyboard.dismiss();
    const data = this.form.getValue();
    if (data) {
      this.setState({
        timesAverageTaken: data.timesAverageTaken,
        form: data,
      }, () => this.reroll());
    }
  }

  setHitPoints = () => {
    const { navigate, state } = this.props.navigation;
    const { hitDie } = this.state.baseClass;
    const { modifier } = this.state.character.profile.stats.constitution;
    state.params.character.lastUpdated = Date.now();
    state.params.character.profile.savingThrows =
      cloneDeep(this.state.savingThrows);
    state.params.character.profile.hitPoints =
      (this.state.hitPoints ? this.state.hitPoints : 0) + hitDie + modifier;
    console.log(state.params.character);
    // TODO: Update with correct screen after development
    navigate('AssignLanguages', { ...state.params });
  }

  toggleNote = () => {
    this.setState({
      isNoteCollapsed: !this.state.isNoteCollapsed,
    });
  }

  reroll = () => {
    const { timesAverageTaken } = this.state;
    const { level } = this.state.character.profile;
    const { modifier } = this.state.character.profile.stats.constitution;
    const additionFromModifier = ((level - 1) * modifier) - (timesAverageTaken * modifier);
    const { hitDie } = this.state.baseClass;
    const average = (hitDie / 2) + 1;

    const rolls = [];
    const rollCount = (level - 1) - timesAverageTaken;
    for (let i = 0; i < rollCount; i += 1) {
      rolls.push(chance.natural({ min: 1, max: hitDie }));
    }
    this.setState({
      rolls: rolls.slice(0),
      hitPoints: (rolls.length === 0 ? 0 : rolls.reduce((sum, x) => sum + x)) +
        (average * timesAverageTaken) + additionFromModifier,
      rollCount: this.state.rollCount + 1,
    });
  }

  render() {
    const { hitDie } = this.state.baseClass;
    const { modifier } = this.state.character.profile.stats.constitution;
    const { level } = this.state.character.profile;
    const average = (hitDie / 2) + 1;
    return (
      <Container style={ContainerStyle.parent}>
        <Content>
          <View style={{ margin: 20 }}>
            <Note
              title={`${this.state.character.profile.baseClass.name} Hit Points`}
              type="info"
              icon="info"
              collapsible
              isCollapsed={this.state.isNoteCollapsed}
              toggleNoteHandler={this.toggleNote}
            >
              <Text style={{ marginBottom: 10 }}>
                The
                <Text style={CardStyle.makeBold}>
                  &nbsp;{this.state.character.profile.baseClass.name}&nbsp;
                </Text>
                class grants a hit die of
                <Text style={CardStyle.makeBold}>
                  &nbsp;1d{hitDie}&nbsp;
                </Text>
                plus your constitution modifier&nbsp;
                <Text style={CardStyle.makeBold}>
                  (+{modifier})
                </Text>
                &nbsp;per level after the first level.
                For the first level, take&nbsp;
                <Text style={CardStyle.makeBold}>
                  {hitDie} + {modifier} = {hitDie + modifier}
                </Text>
                . After every level, add a roll of
                <Text style={CardStyle.makeBold}>
                  &nbsp;1d{hitDie} + {modifier}&nbsp;
                </Text>
                or take
                <Text style={CardStyle.makeBold}>
                  &nbsp;{(hitDie / 2) + 1}&nbsp;
                </Text>
                automatically.{'\n\n'}
                <Text>
                  Total Hit Points = First Level + Later Levels + Modifier Total
                </Text>
              </Text>
            </Note>
            {
              level !== 1 &&
              <View style={FormStyle.horizontalLayout}>
                <View style={{ flex: 3, marginRight: 10 }}>
                  <t.form.Form
                    ref={(c) => { this.form = c; }}
                    type={this.state.type}
                    value={this.state.form}
                    options={this.state.options}
                    onChange={this.onChange}
                  />
                </View>
                <View style={{ flex: 1, marginTop: 30 }}>
                  <Button
                    primary
                    raised
                    text="Update"
                    onPress={this.onPress}
                  />
                </View>
              </View>
            }
            <View
              style={[styles.buttonLayout, { marginTop: 10, marginBottom: 20 }]}
            >
              {
                level !== 1 &&
                <Button
                  accent
                  raised
                  text="Reroll"
                  onPress={() => this.reroll()}
                  disabled={this.state.timesAverageTaken === null}
                  style={{ container: { flex: 1, marginRight: 10 } }}
                />
              }
              <Button
                primary
                raised
                text="Proceed"
                onPress={() => this.setHitPoints()}
                disabled={!this.state.hitPoints && level !== 1}
                style={{ container: { flex: 1, marginLeft: 10 } }}
              />
            </View>
            <View style={styles.horizontalLayout}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.cardTitle}>
                  Times Average Taken
                </Text>
                <Card
                  style={{
                    container: {
                      width: 100,
                      height: 100,
                      padding: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1,
                      flexWrap: 'wrap',
                    },
                  }}
                >
                  <Text style={styles.points}>
                    {
                      this.state.timesAverageTaken === null &&
                      <Text>&mdash;</Text>
                    }
                    {
                      this.state.timesAverageTaken &&
                      this.state.timesAverageTaken
                    }
                  </Text>
                </Card>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.cardTitle}>
                  Hit Points
                </Text>
                <Card
                  style={{
                    container: {
                      width: 100,
                      height: 100,
                      padding: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1,
                      flexWrap: 'wrap',
                    },
                  }}
                >
                  <Text style={styles.points}>
                    {
                      !this.state.hitPoints &&
                      <Text>{hitDie + modifier}</Text>
                    }
                    {
                      this.state.hitPoints &&
                      this.state.hitPoints + hitDie + modifier
                    }
                  </Text>
                </Card>
              </View>
            </View>
            {
              this.state.hitPoints &&
              <Card
                style={{
                  container: {
                    marginTop: 20,
                    padding: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                }}
              >
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                {/* .concat(Array(this.state.timesAverageTaken).fill(average))
                .concat([(level - 1) * modifier]) */}
                  <Text style={CardStyle.makeBold}>
                    First Level
                  </Text>
                  &nbsp;= {hitDie} + {modifier} = {hitDie + modifier}{'\n'}
                  <Text style={CardStyle.makeBold}>
                    Rolls
                  </Text>
                  &nbsp;=&nbsp;
                  {
                    this.state.hitPoints &&
                    this.state.rolls
                      .map(roll => `(${roll} + ${modifier})`)
                      .join(' + ')
                  }
                  &nbsp;=&nbsp;
                  {
                    this.state.hitPoints &&
                    this.state.rolls
                      .map(roll => roll + modifier)
                      .reduce((sum, x) => sum + x)
                  }
                  {'\n'}
                  <Text style={CardStyle.makeBold}>
                    Average Taken
                  </Text>
                  &nbsp;=&nbsp;
                  {
                    Array(this.state.timesAverageTaken).fill(average).join(' + ')
                  }
                  &nbsp;= {this.state.timesAverageTaken * average}{'\n'}
                  <Text style={CardStyle.makeBold}>
                    Total Hit Points
                  </Text>
                  &nbsp;=&nbsp;
                  <Text style={CardStyle.makeBold}>
                    {this.state.hitPoints + hitDie + modifier}
                  </Text>
                </Text>
              </Card>
            }
          </View>
        </Content>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  horizontalLayout: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreList: {
    flex: 1,
    flexDirection: 'row',
  },
  bigHeading: {
    fontFamily: 'RobotoLight',
    color: '#000',
    fontSize: 24,
  },
  smallHeading: {
    fontFamily: 'RobotoLight',
    color: '#000',
    fontSize: 18,
  },
  additionalInfo: {
    fontFamily: 'RobotoLight',
    color: '#000',
    fontSize: 14,
    padding: 10,
  },
  buttonLayout: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    alignSelf: 'center',
  },
  resetButton: {
    backgroundColor: COLOR.red500,
    borderColor: COLOR.red500,
    flex: 1,
    marginLeft: 10,
    marginRight: 5,
  },
  acceptButton: {
    backgroundColor: '#3F51B5',
    borderColor: '#3F51B5',
    flex: 2,
    marginLeft: 5,
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: 'RobotoLight',
    color: '#000',
    fontSize: 18,
    marginBottom: 10,
  },
  points: {
    fontFamily: 'RobotoBold',
    color: '#000',
    fontSize: 28,
  },
  modifier: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    fontFamily: 'RobotoBold',
    color: '#000',
    fontSize: 18,
  },
});
