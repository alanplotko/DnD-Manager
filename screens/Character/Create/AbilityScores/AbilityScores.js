import React from 'react';
import PropTypes from 'prop-types';
import { Keyboard, StyleSheet, View, Text } from 'react-native';
import { Container, Content } from 'native-base';
import { Button, Card, COLOR, Toolbar, withTheme } from 'react-native-material-ui';
import Modal from 'react-native-modal';
import Note from 'FifthEditionManager/components/Note';
import { RACES } from 'FifthEditionManager/config/Info';
import { CardStyle, ContainerStyle, FormStyle } from 'FifthEditionManager/stylesheets';
import { toTitleCase, calculateModifier, validateInteger } from 'FifthEditionManager/util';
import { cloneDeep } from 'lodash';

const t = require('tcomb-form-native');
const Chance = require('chance');

const chance = new Chance();
const abilities = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
];


/**
 * Form valdiation setup
 */

// Integer in range [1, 30]
const AbilityScore = t.refinement(t.Number, n => n % 1 === 0 && n > 0 && n <= 30);
AbilityScore.getValidationErrorMessage = value => validateInteger(
  value,
  'Integer in range [1, 30]',
);

/**
 * Character ability score selection
 */

const AbilityScoreForm = t.struct({
  score: AbilityScore,
});

/**
 * Form stylesheet setup
 */

const stylesheet = cloneDeep(t.form.Form.stylesheet);

stylesheet.formGroup.normal.flexDirection = 'column';
stylesheet.formGroup.error.flexDirection = 'column';
stylesheet.formGroup.normal.alignItems = 'center';
stylesheet.formGroup.error.alignItems = 'center';
stylesheet.textbox.normal.borderWidth = 2;
stylesheet.textbox.error.borderWidth = 2;
stylesheet.textbox.normal.borderColor = COLOR.grey800;
stylesheet.textbox.error.borderColor = COLOR.red800;
stylesheet.textbox.normal.borderRadius = 0;
stylesheet.textbox.error.borderRadius = 0;
stylesheet.textbox.normal.width = 200;
stylesheet.textbox.error.width = 200;
stylesheet.textbox.normal.margin = 0;
stylesheet.textbox.error.margin = 0;

class AbilityScores extends React.Component {
  formOptions = {
    template: locals => (
      <View>
        <View style={styles.formTemplate}>
          <Text style={FormStyle.label}>Editing {toTitleCase(this.state.selectedAbility)}</Text>
        </View>
        {locals.inputs.score}
      </View>
    ),
    stylesheet,
    fields: {
      score: {
        auto: 'none',
        help: 'Range [1, 30]',
      },
    },
  }

  static propTypes = {
    navigation: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      scoreBank: [],
      loading: false,
      isModalVisible: false,
      isErrorCollapsed: true,
      isInfoCollapsed: true,
      selectedAbility: null,
      extraPoints: 0,
      hasExtraPoint: [],
      baseStats: {
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null,
      },
      additionalStats: {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      form: null,
      ...props.navigation.state.params,
    };

    this.state.raceModifiers = RACES
      .find(race => race.key === this.state.character.race.lookupKey)
      .modifiers;

    if (this.state.raceModifiers.extra) {
      this.state.extraPoints = this.state.raceModifiers.extra;
    }
    Object
      .keys(this.state.raceModifiers)
      .filter(key => key !== 'extra')
      .forEach((key) => {
        this.state.additionalStats[key] =
          this.state.raceModifiers[key];
      });

    if (!this.state.manualEntry) {
      this.state.scores.forEach((score) => {
        const index = this.state.scoreBank.findIndex(s => s.score === score);
        if (index !== -1) {
          this.state.scoreBank[index].quantity += 1;
        } else {
          this.state.scoreBank.push({ score, quantity: 1 });
        }
      });
    }
  }

  componentDidMount() {
    this.props.navigation.setParams({ randomizeScoreAssignments: this.randomizeScoreAssignments });
  }

  openModal = (ability) => {
    this.setState({
      isModalVisible: true,
      selectedAbility: ability,
      form: {
        score: this.state.baseStats[ability],
      },
    });
  }

  cancelModal = () => {
    this.setState({ isModalVisible: false, selectedAbility: null });
  }

  selectScore = (scoreCard) => {
    const ability = this.state.selectedAbility;
    const scoreBank = this.state.scoreBank.slice(0);
    const baseStats = Object.assign({}, this.state.baseStats);

    // Add 1 to previously selected score's quantity
    const currentScore = baseStats[ability];
    if (currentScore) {
      const currentIndex = scoreBank.findIndex(s => s.score === currentScore);
      if (currentIndex > -1) {
        scoreBank[currentIndex].quantity += 1;
      }
    }

    // Remove 1 from new selected score's quantity
    const newIndex = scoreBank.findIndex(s => s.score === scoreCard.score);
    scoreBank[newIndex].quantity -= 1;

    // Set new score
    baseStats[ability] = scoreBank[newIndex].score;

    this.setState({ scoreBank, baseStats });
  }

  onPress = () => {
    const { state, navigate } = this.props.navigation;
    const newCharacter = cloneDeep(state.params.character);
    newCharacter.meta.lastUpdated = Date.now();
    newCharacter.stats = {};
    abilities.forEach((ability) => {
      const abilityName = ability.toLowerCase();
      const score = this.state.baseStats[abilityName] + this.state.additionalStats[abilityName];
      const modifier = calculateModifier(score);
      const total = score + modifier;
      newCharacter.stats[abilityName] = { score, modifier, total };
    });
    navigate('SetSkills', { character: newCharacter });
  }

  onChange = (value) => {
    this.setState({ form: value });
  }

  submitScore = () => {
    Keyboard.dismiss();
    const input = this.form.getValue();
    if (input) {
      const ability = this.state.selectedAbility;
      const baseStats = Object.assign({}, this.state.baseStats);

      // Set new score
      baseStats[ability] = input.score;
      this.setState({ baseStats });
    }
  }

  resetStat = (ability) => {
    const scoreBank = this.state.scoreBank.slice(0);
    const baseStats = Object.assign({}, this.state.baseStats);

    // Add 1 to previously selected score's quantity
    const currentScore = baseStats[ability];
    if (currentScore) {
      const currentIndex = scoreBank.findIndex(s => s.score === currentScore);
      if (currentIndex > -1) {
        scoreBank[currentIndex].quantity += 1;
      }
    }

    // Remove extra modifier if present
    if (this.state.hasExtraPoint.includes(ability)) {
      this.removeExtraModifier(ability);
    }

    baseStats[ability] = null;
    this.setState({ scoreBank, baseStats });
  }

  addExtraModifier = (ability) => {
    // Record ability as having an extra modifier
    const hasExtraPoint = this.state.hasExtraPoint.slice(0);
    hasExtraPoint.push(ability);

    // Add extra modifier to stat
    const additionalStats = Object.assign({}, this.state.additionalStats);
    additionalStats[ability] += 1;


    // Remove modifier from extra point pool
    let { extraPoints } = this.state;
    extraPoints -= 1;

    this.setState({ extraPoints, hasExtraPoint, additionalStats });
  }

  removeExtraModifier = (ability) => {
    // Remove ability from record of having an extra modifier
    let hasExtraPoint = this.state.hasExtraPoint.slice(0);
    hasExtraPoint = hasExtraPoint.filter(a => a !== ability);

    // Remove extra modifier from stat
    const additionalStats = Object.assign({}, this.state.additionalStats);
    additionalStats[ability] -= 1;

    // Return modifier to extra point pool
    let { extraPoints } = this.state;
    extraPoints += 1;

    this.setState({ extraPoints, hasExtraPoint, additionalStats });
  }

  toggleInfoNote = () => {
    this.setState({ isInfoCollapsed: !this.state.isInfoCollapsed });
  }

  toggleErrorNote = () => {
    this.setState({ isErrorCollapsed: !this.state.isErrorCollapsed });
  }

  resetScoreBank = (done) => {
    this.setState({ loading: true }, () => {
      if (Object.values(this.state.baseStats).every(stat => stat === null)) {
        return done();
      }
      const scoreBank = [];
      if (!this.state.manualEntry) {
        this.state.scores.forEach((score) => {
          const index = scoreBank.findIndex(s => s.score === score);
          if (index !== -1) {
            scoreBank[index].quantity += 1;
          } else {
            scoreBank.push({ score, quantity: 1 });
          }
        });
      }
      return this.setState({
        baseStats: {
          strength: null,
          dexterity: null,
          constitution: null,
          intelligence: null,
          wisdom: null,
          charisma: null,
        },
        scoreBank,
      }, done);
    });
  }

  randomizeScoreAssignments = () => {
    this.resetScoreBank(() => {
      const scoreBank = this.state.scoreBank.slice(0);
      const baseStats = Object.assign({}, this.state.baseStats);
      if (this.state.manualEntry) {
        Object.keys(baseStats).forEach((stat) => {
          baseStats[stat] = chance.natural({ min: 1, max: 30 });
        });
      } else {
        Object.keys(baseStats).forEach((stat) => {
          baseStats[stat] = chance.pickone(scoreBank.filter(item => item.quantity > 0)).score;
          scoreBank[scoreBank.findIndex(item => item.score === baseStats[stat])].quantity -= 1;
        });
      }
      this.setState({ scoreBank, baseStats, loading: false });
    });
  }

  static navigationOptions = {
    header: ({ navigation }) => {
      const { routes, index } = navigation.state;
      const props = {
        leftElement: 'arrow-back',
        onLeftElementPress: () => navigation.goBack(routes[index].key),
        centerElement: 'Assign Ability Scores',
        rightElement: 'autorenew',
        onRightElementPress: () => routes[index].params.randomizeScoreAssignments(),
      };
      return <Toolbar {...props} />;
    },
  }

  render() {
    // Theme setup
    const { textColor, backgroundColor } = this.props.theme.palette;
    const textStyle = { color: textColor };
    const modalBackgroundStyle = { backgroundColor };

    const isSelectable = scoreCard => (
      // Score is selected
      (this.state.baseStats[this.state.selectedAbility] === scoreCard.score) ||
      // Score is not selected and has at least 1 remaining
      (this.state.baseStats[this.state.selectedAbility] !== scoreCard.score &&
        scoreCard.quantity > 0)
    );
    const isSelected = scoreCard => (
      this.state.baseStats[this.state.selectedAbility] === scoreCard.score
    );
    const buildAbilityCard = (ability) => {
      const abilityScore = this.state.baseStats[ability];
      const additionalPoints = this.state.additionalStats[ability];
      const totalScore = abilityScore + additionalPoints;
      const modifier = calculateModifier(totalScore);

      return (
        <View style={[styles.centered, { width: 100, height: 140 }]}>
          <Card
            style={{
              container: {
                width: 100,
                height: 100,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
              },
            }}
            onPress={() => this.openModal(ability)}
          >
            {
              this.state.baseStats[ability] &&
              <Text style={[styles.scoreText, textStyle]}>
                {totalScore}
              </Text>
            }
            {
              this.state.baseStats[ability] &&
              <Text
                style={[styles.modifierText, textStyle]}
              >
                {
                  modifier > 0 &&
                  <Text style={{ color: COLOR.green500 }}>
                    +{modifier}
                  </Text>
                }
                {
                  modifier === 0 &&
                  <Text>
                    +{modifier}
                  </Text>
                }
                {
                  modifier < 0 &&
                  <Text style={{ color: COLOR.red500 }}>
                    &minus;{modifier * -1}
                  </Text>
                }
              </Text>
            }
            {
              !this.state.baseStats[ability] &&
              <Text style={[styles.cardText, textStyle]}>&mdash;</Text>
            }
          </Card>
          <Button
            accent
            raised
            text="Reset"
            icon="refresh"
            disabled={!this.state.baseStats[ability]}
            onPress={() => this.resetStat(ability)}
            style={{
              container: { width: 100 },
            }}
          />
        </View>
      );
    };
    const buildScoreCard = (scoreCard) => {
      const standardColor = isSelectable(scoreCard) ?
        COLOR.white :
        COLOR.redA100;
      const scoreBackgroundColor = isSelected(scoreCard) ?
        COLOR.greenA100 :
        standardColor;
      return (
        <View
          key={`${scoreCard.score}-${scoreCard.quantity}`}
          style={{ width: 90, height: 90 }}
        >
          <Card
            style={{
              container: {
                width: 80,
                height: 80,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: scoreBackgroundColor,
                opacity: isSelectable(scoreCard) ? 1 : 0.3,
              },
            }}
            onPress={
              this.state.baseStats[this.state.selectedAbility] !==
                scoreCard.score && scoreCard.quantity > 0 ?
                () => this.selectScore(scoreCard) :
                null
            }
          >
            {
              scoreCard.score &&
              <Text style={[styles.cardText, textStyle]}>{scoreCard.score}</Text>
            }
            {
              !scoreCard.score &&
              <Text style={[styles.cardText, textStyle]}>&mdash;</Text>
            }
            {
              scoreCard.quantity !== null &&
              <Text style={[styles.quantityText, textStyle]}>
                &times;{scoreCard.quantity}
              </Text>
            }
          </Card>
        </View>
      );
    };
    const buildModal = () => {
      const ability = this.state.selectedAbility;
      const hasExtraPoint = this.state.hasExtraPoint.includes(ability);
      const characterHasModifier = this.state.raceModifiers[ability];
      const abilityScore = this.state.baseStats[ability];
      const additionalPoints = this.state.additionalStats[ability];
      const totalScore = abilityScore + additionalPoints;

      return (
        <View style={[styles.modalContainerLayout, modalBackgroundStyle]}>
          {
            !this.state.manualEntry && ability &&
            <Text style={styles.cardTitle}>
              Editing {toTitleCase(ability)}
            </Text>
          }
          {
            !this.state.manualEntry &&
            <View style={styles.modalScoreCardLayout}>
              {this.state.scoreBank.map(card => buildScoreCard(card))}
            </View>
          }
          {
            this.state.manualEntry &&
            <View>
              <t.form.Form
                ref={(c) => { this.form = c; }}
                type={AbilityScoreForm}
                value={this.state.form}
                options={this.formOptions}
                onChange={this.onChange}
              />
              <Button
                primary
                raised
                disabled={!this.state.form || (this.state.form && !this.state.form.score)}
                onPress={this.submitScore}
                text="Save"
                style={{ container: { marginBottom: 10 } }}
              />
            </View>
          }
          {
            this.state.raceModifiers.extra &&
            <Button
              onPress={
                !hasExtraPoint ?
                  () => this.addExtraModifier(ability) :
                  () => this.removeExtraModifier(ability)
              }
              raised
              primary={!hasExtraPoint}
              accent={hasExtraPoint}
              text={hasExtraPoint ? 'Remove Extra Point' : 'Use Extra Point'}
              disabled={
                !abilityScore ||
                (!hasExtraPoint && this.state.extraPoints === 0)
              }
              style={{ container: { marginBottom: 10 } }}
            />
          }
          {
            ability &&
            <View>
              <Card style={{ container: { padding: 10 } }}>
                {
                  abilityScore &&
                  <Text style={styles.calculationTitle}>
                    Total:&nbsp;
                    <Text style={[styles.calculationText, textStyle]}>
                      {abilityScore || '?'}
                      <Text style={{ color: COLOR.green500 }}>
                        {characterHasModifier && ` + ${characterHasModifier}`}
                        {hasExtraPoint && ' + 1'}
                      </Text>
                      {
                        (characterHasModifier || hasExtraPoint) &&
                        <Text>
                          &nbsp;=&nbsp;{totalScore}
                        </Text>
                      }
                    </Text>
                  </Text>
                }
                {
                  !abilityScore &&
                  <Text style={styles.calculationTitle}>
                    No Score Selected
                  </Text>
                }
              </Card>
            </View>
          }
        </View>
      );
    };
    const modifierList = Object.keys(this.state.raceModifiers).filter(name => name !== 'extra');
    const pointPlurality = this.state.extraPoints > 1 ? 'points' : 'point';

    return (
      <Container style={ContainerStyle.parent}>
        <Content>
          <View style={ContainerStyle.padded}>
            <Text style={FormStyle.heading}>Character Ability Scores</Text>
            {
              modifierList.length > 0 &&
              <Note
                title={`${this.state.character.race.name} Stats`}
                type="info"
                icon="info"
                collapsible
                isCollapsed={this.state.isInfoCollapsed}
                toggleNoteHandler={this.toggleInfoNote}
              >
                <Text style={{ marginBottom: 10 }}>
                  The
                  <Text style={CardStyle.makeBold}>
                    &nbsp;{this.state.character.race.name}&nbsp;
                  </Text>
                  race grants the following points and will be allocated
                  automatically:{'\n\n'}
                </Text>
                {modifierList.map(key => (
                  <Text key={key}>
                    &emsp;&bull;&nbsp;{toTitleCase(key)}&nbsp;(
                    {this.state.raceModifiers[key] > 0 ? '+' : ''}
                    {this.state.raceModifiers[key]})
                    {'\n'}
                  </Text>
                ))}
              </Note>
            }
            {
              this.state.extraPoints > 0 &&
              <Note
                title={`${this.state.extraPoints} ${pointPlurality} remaining!`}
                type="error"
                icon="error"
                collapsible
                isCollapsed={this.state.isErrorCollapsed}
                toggleNoteHandler={this.toggleErrorNote}
              >
                <Text>
                  The
                  <Text style={CardStyle.makeBold}>
                    &nbsp;{this.state.character.race.name}&nbsp;
                  </Text>
                  race grants an additional
                  <Text style={CardStyle.makeBold}>
                    &nbsp;
                    {this.state.raceModifiers.extra}
                    &nbsp;
                  </Text>
                  points to your abilities. You can allocate only 1 additional
                  point for a single ability until all
                  <Text style={CardStyle.makeBold}>
                    &nbsp;
                    {this.state.raceModifiers.extra}
                    &nbsp;
                  </Text>
                  points are spent.
                </Text>
              </Note>
            }
            <View style={styles.horizontalLayout}>
              {abilities.slice(0, 3).map(ability => (
                <View key={ability} style={styles.centered}>
                  <Text style={[styles.abilityText, textStyle]}>{ability}</Text>
                  {buildAbilityCard(ability.toLowerCase())}
                </View>
              ))}
            </View>
            <View style={styles.horizontalLayout}>
              {abilities.slice(3, 6).map(ability => (
                <View key={ability} style={styles.centered}>
                  <Text style={[styles.abilityText, textStyle]}>{ability}</Text>
                  {buildAbilityCard(ability.toLowerCase())}
                </View>
              ))}
            </View>
            <Button
              primary
              raised
              disabled={
                this.state.loading ||
                this.state.isModalVisible ||
                this.state.extraPoints > 0 ||
                Object.values(this.state.baseStats).includes(null)
              }
              onPress={this.onPress}
              text="Proceed"
              style={{ container: { marginTop: 20, marginBottom: 10 } }}
            />
          </View>
          <Modal
            isVisible={this.state.isModalVisible}
            onBackButtonPress={() => this.cancelModal()}
            onBackdropPress={() => this.cancelModal()}
            backdropOpacity={0.7}
            style={{ margin: 0 }}
          >
            {buildModal()}
          </Modal>
        </Content>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  abilityText: {
    fontFamily: 'RobotoLight',
    color: COLOR.black,
    fontSize: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    fontFamily: 'RobotoLight',
    color: COLOR.black,
    fontSize: 16,
  },
  horizontalLayout: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalContainerLayout: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: COLOR.grey200,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
  },
  modalScoreCardLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: 'RobotoLight',
    color: COLOR.black,
    fontSize: 24,
    marginBottom: 10,
  },
  calculationTitle: {
    fontFamily: 'RobotoLight',
    color: COLOR.black,
    fontSize: 24,
  },
  calculationText: {
    fontFamily: 'RobotoBold',
    color: COLOR.black,
    fontSize: 24,
  },
  cardText: {
    fontFamily: 'RobotoBold',
    color: COLOR.black,
    fontSize: 28,
  },
  scoreText: {
    fontFamily: 'RobotoBold',
    color: COLOR.black,
    fontSize: 28,
  },
  modifierText: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    fontFamily: 'RobotoBold',
    color: COLOR.black,
    fontSize: 18,
  },
  formTemplate: {
    borderWidth: 2,
    borderColor: COLOR.grey800,
    backgroundColor: COLOR.grey800,
    width: 200,
    height: 35,
  },
});

export default withTheme(AbilityScores);
